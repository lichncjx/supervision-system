import { Role, WorkItemStatus, WorkItemType } from '@prisma/client'
import {
  canApproveWorkItem,
  canHandleWorkItem,
  isWorkMainResponsibleDepartment,
  type PermissionWorkItem,
} from '@/features/works/domain/work.permissions'
import type { UserSession, ApproverAssignment } from './workflow.types'
import { APPROVAL_STATUSES } from './workflow.constants'

export function toPermissionUser(user: UserSession) {
  return {
    id: user.userId,
    role: user.role,
    departmentId: user.departmentId,
  }
}

export function isApprovalStatus(status: WorkItemStatus) {
  return APPROVAL_STATUSES.includes(status)
}

export function isDepartmentRole(role: Role) {
  return role === Role.DEPARTMENT_MANAGER || role === Role.DEPARTMENT_LEADER
}

export function isCompanyLeaderRole(role: Role) {
  return role === Role.VICE_PRESIDENT || role === Role.PRESIDENT
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
): ApproverAssignment {
  const leaderId =
    source === 'propose'
      ? workItem.proposedLeaderId ?? workItem.approvalLeaderId
      : workItem.approvalLeaderId ?? workItem.proposedLeaderId

  return {
    currentApproverId: leaderId ?? null,
    currentApproverRole: Role.VICE_PRESIDENT,
  }
}

export function getProposalFirstApprover(
  workItem: {
    proposedLeaderId?: number | null
    approvalLeaderId?: number | null
  },
  user: UserSession,
): ApproverAssignment {
  if (user.role === Role.DEPARTMENT_MANAGER) {
    return departmentLeaderAssignment()
  }

  if (user.role === Role.DEPARTMENT_LEADER) {
    return companyLeaderAssignment(workItem, 'propose')
  }

  if (isCompanyLeaderRole(user.role)) {
    return companyLeaderAssignment(workItem, 'propose')
  }

  return departmentLeaderAssignment()
}

export function getProcessFirstApprover(
  workItem: {
    proposedLeaderId?: number | null
    approvalLeaderId?: number | null
  },
  user: UserSession,
): ApproverAssignment {
  if (user.role === Role.DEPARTMENT_MANAGER) {
    return departmentLeaderAssignment()
  }

  if (user.role === Role.DEPARTMENT_LEADER) {
    return companyLeaderAssignment(workItem, 'approval')
  }

  return companyLeaderAssignment(workItem, 'approval')
}

export function shouldEscalateCancelToPresident(workItem: {
  type: WorkItemType
  needMainLeaderCancel?: boolean | null
}) {
  return workItem.type === WorkItemType.PRIORITY && workItem.needMainLeaderCancel === true
}

export function isDepartmentApprovalNode(workItem: {
  currentApproverRole?: Role | string | null
}) {
  return workItem.currentApproverRole === Role.DEPARTMENT_LEADER
}

export function isPresidentApprovalNode(workItem: {
  currentApproverRole?: Role | string | null
}) {
  return workItem.currentApproverRole === Role.PRESIDENT
}

export function canUserHandle(
  user: UserSession,
  workItem: PermissionWorkItem,
) {
  return canHandleWorkItem(toPermissionUser(user), workItem)
}

export function canUserCancelDraft(
  user: UserSession,
  workItem: {
    creatorId?: number | null
    firstSubmitterId?: number | null
  } & PermissionWorkItem,
) {
  if (workItem.creatorId === user.userId) return true
  if ((workItem.firstSubmitterId ?? workItem.creatorId) === user.userId)
    return true
  return canUserHandle(user, workItem)
}

export function ensureMainResponsibleDepartment(
  user: UserSession,
  workItem: PermissionWorkItem,
) {
  return (
    isDepartmentRole(user.role) &&
    isWorkMainResponsibleDepartment(workItem, user.departmentId)
  )
}

export function rejectableBeforeStatus(workItem: {
  beforeApprovalStatus?: WorkItemStatus | string | null
}): WorkItemStatus | null {
  return (workItem.beforeApprovalStatus as WorkItemStatus) ?? null
}

export function canUserApprove(
  workItem: PermissionWorkItem,
  user: UserSession,
): boolean {
  return canApproveWorkItem(toPermissionUser(user), workItem)
}

export function canUserSubmit(
  workItem: PermissionWorkItem,
  user: UserSession,
): boolean {
  if (String(workItem.status).toUpperCase() !== WorkItemStatus.DRAFT) {
    return false
  }

  if (workItem.creatorId === user.userId) return true
  if ((workItem.firstSubmitterId ?? workItem.creatorId) === user.userId)
    return true
  return canHandleWorkItem(toPermissionUser(user), workItem)
}
