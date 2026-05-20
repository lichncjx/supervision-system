import { Role, WorkItemStatus, WorkItemType } from '@prisma/client'
import {
  shouldHandleWorkItem,
  canOperateWorkItem,
  isWorkMainResponsibleDepartment,
  type PermissionWorkItem,
} from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { ApproverAssignment } from './workflow.types'
import { APPROVAL_STATUSES } from './workflow.constants'
import { isCompanyLevel, isDepartmentLevel, isDeptManager, isDeptLeader, isPresident } from '@/features/users/domain/role.rules'

export function isApprovalStatus(status: WorkItemStatus) {
  return APPROVAL_STATUSES.includes(status)
}

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
): ApproverAssignment | null {
  if (isDeptManager(user.role)) {
    return departmentLeaderAssignment()
  }

  if (isDeptLeader(user.role)) {
    return companyLeaderAssignment(workItem, 'propose')
  }

  if (isCompanyLevel(user.role)) {
    return companyLeaderAssignment(workItem, 'propose')
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

export function rejectableBeforeStatus(workItem: {
  beforeApprovalStatus?: WorkItemStatus | string | null
}): WorkItemStatus | null {
  return (workItem.beforeApprovalStatus as WorkItemStatus) ?? null
}

export function canUserSubmit(
  workItem: PermissionWorkItem,
  user: BaseCurrentUser,
): boolean {
  if (String(workItem.status).toUpperCase() !== WorkItemStatus.DRAFT) {
    return false
  }

  if (workItem.creatorId === user.id) return true
  if ((workItem.firstSubmitterId ?? workItem.creatorId) === user.id)
    return true
  return shouldHandleWorkItem(toPermissionUser(user), workItem)
}
