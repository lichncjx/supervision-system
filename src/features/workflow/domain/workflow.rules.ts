import { ApprovalType, Role, WorkItemStatus, WorkItemType } from '@prisma/client'
import {
  shouldHandleWorkItem,
  canOperateWorkItem,
  isWorkMainResponsibleDepartment,
  type PermissionWorkItem,
} from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { ApproverAssignment } from './workflow.types'
import { isCompanyLevel, isDepartmentLevel, isDeptManager, isDeptLeader, isPresident } from '@/features/users/domain/role.rules'

export function departmentLeaderAssignment(): ApproverAssignment {
  return {
    currentApproverId: null,
    currentApproverRole: Role.DEPARTMENT_LEADER,
  }
}

export function companyLeaderAssignment(
  workItem: {
    proposedLeaderId?: number | null
    approvalLeaderId?: number | null
  },
  source: 'propose' | 'approval' = 'approval',
  nextApproverId?: number | null,
): ApproverAssignment | null {
  const leaderId =
    source === 'propose'
      ? workItem.proposedLeaderId ?? workItem.approvalLeaderId
      : workItem.approvalLeaderId ?? workItem.proposedLeaderId

  const currentApproverId = leaderId ?? nextApproverId
  if (!currentApproverId) return null

  return {
    currentApproverId,
    currentApproverRole: Role.VICE_PRESIDENT,
  }
}

export function getProposalFirstApprover(
  workItem: {
    proposedLeaderId?: number | null
    approvalLeaderId?: number | null
  },
  user: BaseCurrentUser,
  nextApproverId?: number | null,
): ApproverAssignment | null {
  if (isDeptManager(user.role)) {
    return departmentLeaderAssignment()
  }

  if (isDeptLeader(user.role)) {
    return companyLeaderAssignment(workItem, 'propose', nextApproverId)
  }

  if (isCompanyLevel(user.role)) {
    return companyLeaderAssignment(workItem, 'propose', nextApproverId)
  }

  return departmentLeaderAssignment()
}

export function getProcessFirstApprover(
  workItem: {
    proposedLeaderId?: number | null
    approvalLeaderId?: number | null
  },
  user: BaseCurrentUser,
): ApproverAssignment | null {
  if (isDeptManager(user.role)) {
    return departmentLeaderAssignment()
  }

  if (isDeptLeader(user.role)) {
    return companyLeaderAssignment(workItem, 'approval')
  }

  return companyLeaderAssignment(workItem, 'approval')
}

/** 当前业务规则：重点工作取消均需主要领导审批；needMainLeaderCancel 为历史兼容字段，不参与当前判断。 */
export function shouldEscalateCancelToPresident(workItem: {
  type: WorkItemType
}) {
  return workItem.type === WorkItemType.PRIORITY
}

export function isDepartmentApprovalNode(workItem: {
  currentApproverRole?: Role | string | null
}) {
  return isDeptLeader(workItem.currentApproverRole)
}

export function isPresidentApprovalNode(workItem: {
  currentApproverRole?: Role | string | null
}) {
  return isPresident(workItem.currentApproverRole)
}

export function canUserHandle(
  user: BaseCurrentUser,
  workItem: PermissionWorkItem,
) {
  return shouldHandleWorkItem(toPermissionUser(user), workItem)
}

export function canUserOperate(
  user: BaseCurrentUser,
  workItem: PermissionWorkItem,
) {
  return canOperateWorkItem(toPermissionUser(user), workItem)
}

export function ensureMainResponsibleDepartment(
  user: BaseCurrentUser,
  workItem: PermissionWorkItem,
) {
  return (
    isDepartmentLevel(user.role) &&
    isWorkMainResponsibleDepartment(workItem, user.departmentId)
  )
}

export type NextApprovalAssignmentResult =
  | { kind: 'next'; approver: ApproverAssignment }
  | { kind: 'complete' }
  | { kind: 'missingCompanyLeader' }

export function getNextApprovalAssignment(
  workItem: {
    type: WorkItemType
    currentApproverRole?: Role | string | null
    currentApproverId?: number | null
    proposedLeaderId?: number | null
    approvalLeaderId?: number | null
  },
  approvalType: ApprovalType,
  presidentId: number | null,
  nextApproverId?: number | null,
): NextApprovalAssignmentResult {
  if (approvalType === ApprovalType.PROPOSE) {
    if (isDepartmentApprovalNode(workItem)) {
      const approver = companyLeaderAssignment(workItem, 'propose', nextApproverId)
      return approver ? { kind: 'next', approver } : { kind: 'missingCompanyLeader' }
    }
    return { kind: 'complete' }
  }

  if (
    approvalType === ApprovalType.ADJUST ||
    approvalType === ApprovalType.COMPLETE
  ) {
    if (isDepartmentApprovalNode(workItem)) {
      const approver = companyLeaderAssignment(workItem, 'approval', nextApproverId)
      return approver ? { kind: 'next', approver } : { kind: 'missingCompanyLeader' }
    }
    return { kind: 'complete' }
  }

  if (approvalType === ApprovalType.CANCEL) {
    if (isDepartmentApprovalNode(workItem)) {
      const approver = companyLeaderAssignment(workItem, 'approval', nextApproverId)
      return approver ? { kind: 'next', approver } : { kind: 'missingCompanyLeader' }
    }

    if (
      shouldEscalateCancelToPresident(workItem) &&
      !isPresidentApprovalNode(workItem)
    ) {
      if (!presidentId) return { kind: 'missingCompanyLeader' }
      if (workItem.currentApproverId === presidentId) {
        return { kind: 'complete' }
      }
      return { kind: 'next', approver: { currentApproverId: presidentId, currentApproverRole: Role.PRESIDENT } }
    }

    return { kind: 'complete' }
  }

  return { kind: 'complete' }
}

export function getTargetStatus(approvalType: ApprovalType): WorkItemStatus {
  const map: Record<ApprovalType, WorkItemStatus> = {
    [ApprovalType.PROPOSE]: WorkItemStatus.IN_PROGRESS,
    [ApprovalType.ADJUST]: WorkItemStatus.IN_PROGRESS,
    [ApprovalType.CANCEL]: WorkItemStatus.CANCELLED,
    [ApprovalType.COMPLETE]: WorkItemStatus.COMPLETED,
  }
  return map[approvalType]
}

export function rejectableBeforeStatus(workItem: {
  beforeApprovalStatus?: WorkItemStatus | string | null
}): WorkItemStatus | null {
  return (workItem.beforeApprovalStatus as WorkItemStatus) ?? null
}


/**
 * 提交权限：仅草稿创建人可以提交。
 *
 * - PRIORITY / MAIN / 部门创建的 TODO：提交后进入 PROPOSING，
 *   firstSubmitterId = creatorId；被拒回到 DRAFT，仍由创建人重提。
 * - 公司领导创建的 TODO：提交后进入 PENDING_DECOMPOSE；部门分解后进入
 *   PROPOSING；被拒回到 PENDING_DECOMPOSE，由 decomposeTodoWork 处理，
 *   不走本函数。
 * - 当前业务规则不支持"同部门非创建人代提交"。
 */
export function canUserSubmit(
  workItem: PermissionWorkItem,
  user: BaseCurrentUser,
): boolean {
  return workItem.status === WorkItemStatus.DRAFT
      && workItem.creatorId === user.id
}
