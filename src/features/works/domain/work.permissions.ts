import {
  Prisma,
  Role,
  type User,
  WorkItemStatus,
  WorkItemType,
  ApprovalType,
} from '@prisma/client'
import { isReturnedDraftWork, isReturnedInProgressWork } from './work-status.rules'
import { isGlobalView, isDepartmentLevel, isAdmin, isSupervisor, isPresident, isVicePresident } from '@/features/users/domain/role.rules'

const APPROVAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
]

export type PermissionUser = Pick<User, 'id' | 'role' | 'departmentId'>

export interface PermissionWorkItem {
  id?: number
  type?: WorkItemType | string
  status?: WorkItemStatus | string
  departmentId?: number | null
  cooperators?: unknown
  creatorId?: number | null
  firstSubmitterId?: number | null
  proposedLeaderId?: number | null
  approvalLeaderId?: number | null
  currentApproverId?: number | null
  currentApproverRole?: Role | string | null
  beforeApprovalStatus?: WorkItemStatus | string | null
  approvalType?: ApprovalType | string | null
  rejectReason?: string | null
  rejectedFromStatus?: WorkItemStatus | string | null
  rejectedAt?: Date | string | null
  needMainLeaderCancel?: boolean | null
}

function uniquePositiveIds(values: unknown[]): number[] {
  const ids = new Set<number>()
  for (const value of values) {
    const id = Number(value)
    if (Number.isFinite(id) && id > 0) {
      ids.add(id)
    }
  }
  return Array.from(ids)
}

function normalizeStatus(status: PermissionWorkItem['status']): string {
  return String(status || '').toUpperCase()
}

export function getResponsibleDepartmentIds(
  workItem: PermissionWorkItem,
): number[] {
  return uniquePositiveIds([workItem.departmentId])
}

export function getCooperatorDepartmentIds(
  workItem: PermissionWorkItem,
): number[] {
  const cooperators = workItem.cooperators
  if (!Array.isArray(cooperators)) return []
  return uniquePositiveIds(
    cooperators.map((c: any) => c?.departmentId).filter(Boolean),
  )
}

export function isWorkRelatedToDepartment(
  workItem: PermissionWorkItem,
  departmentId?: number | null,
): boolean {
  if (!departmentId) return false
  return (
    getResponsibleDepartmentIds(workItem).includes(departmentId) ||
    getCooperatorDepartmentIds(workItem).includes(departmentId)
  )
}

export function isWorkMainResponsibleDepartment(
  workItem: PermissionWorkItem,
  departmentId?: number | null,
): boolean {
  if (!departmentId) return false
  return getResponsibleDepartmentIds(workItem).includes(departmentId)
}

export function buildWorkVisibilityWhere(
  user: PermissionUser,
): Prisma.WorkItemWhereInput {
  if (isGlobalView(user.role)) {
    return {}
  }

  if (isDepartmentLevel(user.role)) {
    return {}
  }

  if (isVicePresident(user.role)) {
    return {
      OR: [
        { proposedLeaderId: user.id },
        { approvalLeaderId: user.id },
        { currentApproverId: user.id },
      ],
    }
  }

  if (isPresident(user.role)) {
    return {
      OR: [
        { proposedLeaderId: user.id },
        { approvalLeaderId: user.id },
        { currentApproverId: user.id },
        { currentApproverRole: Role.PRESIDENT },
        { needMainLeaderCancel: true },
      ],
    }
  }

  return { id: -1 }
}

export function canViewWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (isGlobalView(user.role)) return true

  if (isDepartmentLevel(user.role)) {
    return (
      isWorkRelatedToDepartment(workItem, user.departmentId) ||
      workItem.currentApproverId === user.id
    )
  }

  if (isVicePresident(user.role)) {
    return (
      workItem.proposedLeaderId === user.id ||
      workItem.approvalLeaderId === user.id ||
      workItem.currentApproverId === user.id
    )
  }

  if (isPresident(user.role)) {
    return (
      workItem.proposedLeaderId === user.id ||
      workItem.approvalLeaderId === user.id ||
      workItem.currentApproverId === user.id ||
      isPresident(workItem.currentApproverRole) ||
      workItem.needMainLeaderCancel === true
    )
  }

  return false
}

export function canAccessWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  return canViewWorkItem(user, workItem)
}

export function canApproveWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (isGlobalView(user.role)) return false
  if (
    // todo: extract this status check to a separate function and reuse in related permission checks
    !APPROVAL_STATUSES.includes(
      normalizeStatus(workItem.status) as WorkItemStatus,
    )
  )
    return false

  if (workItem.currentApproverId) {
    return workItem.currentApproverId === user.id
  }

  const currentApproverRole = workItem.currentApproverRole as
    | Role
    | string
    | null
    | undefined
  if (currentApproverRole && currentApproverRole !== user.role) {
    return false
  }

  if (
    isDepartmentLevel(user.role)
  ) {
    return (
      currentApproverRole === user.role &&
      isWorkMainResponsibleDepartment(workItem, user.departmentId)
    )
  }

  if (isPresident(user.role)) {
    return (
      isPresident(currentApproverRole) ||
      (!currentApproverRole && workItem.needMainLeaderCancel === true)
    )
  }

  if (isVicePresident(user.role)) {
    if (isVicePresident(currentApproverRole)) {
      return (
        !workItem.proposedLeaderId ||
        workItem.proposedLeaderId === user.id ||
        workItem.approvalLeaderId === user.id
      )
    }

    return (
      !currentApproverRole &&
      (workItem.approvalLeaderId === user.id ||
        workItem.proposedLeaderId === user.id)
    )
  }

  return false
}

/**
 * Broad operation permission for workflow actions (submit completion, adjust, cancel)
 * and attachment uploads on non-terminal items.
 *
 * This is the foundation — shouldHandleWorkItem builds on it by narrowing.
 */
export function canOperateWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  // ADMIN/SUPERVISOR do not initiate workflow state changes.
  // Attachment uploads are handled by canUploadAttachment's own bypass.
  if (isGlobalView(user.role)) return false

  const status = normalizeStatus(workItem.status)
  if (status === 'COMPLETED' || status === 'CANCELLED') return false

  const ownerId = workItem.firstSubmitterId ?? workItem.creatorId

  if (isDepartmentLevel(user.role)) {
    if (isWorkMainResponsibleDepartment(workItem, user.departmentId)) {
      if (
        status === WorkItemStatus.IN_PROGRESS ||
        status === WorkItemStatus.PENDING_DECOMPOSE
      )
        return true
      if (status === WorkItemStatus.DRAFT && ownerId === user.id)
        return true
      return false
    }
    // Not main dept, but owner can still operate on own non-terminal items
    if (ownerId !== user.id) return false
    return status !== 'COMPLETED' && status !== 'CANCELLED'
  }

  // Non-department roles: operate on own non-terminal items
  if (ownerId !== user.id) return false
  return status !== 'COMPLETED' && status !== 'CANCELLED'
}

/**
 * Narrow handling check — only items that require immediate user action (待办理).
 *
 * Builds on canOperateWorkItem and further narrows:
 * - ADMIN/SUPERVISOR never have 待办理.
 * - IN_PROGRESS only counts when returned from approval (rejected adjust/cancel/complete).
 * - DRAFT (non-returned) for department roles outside their main department is excluded.
 */
export function shouldHandleWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (isGlobalView(user.role)) return false
  if (!canOperateWorkItem(user, workItem)) return false

  const status = normalizeStatus(workItem.status)
  const ownerId = workItem.firstSubmitterId ?? workItem.creatorId

  if (status === WorkItemStatus.IN_PROGRESS)
    return isReturnedInProgressWork(workItem) && ownerId === user.id

  if (
    status === WorkItemStatus.DRAFT &&
    !isReturnedDraftWork(workItem) &&
    isDepartmentLevel(user.role) &&
    !isWorkMainResponsibleDepartment(workItem, user.departmentId)
  )
    return false

  return true
}

export function canEditWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  const status = normalizeStatus(workItem.status)
  if (status !== WorkItemStatus.DRAFT) {
    return false
  }

  const returnedDraft = isReturnedDraftWork(workItem)

  if (isGlobalView(user.role)) return true
  if (returnedDraft) {
    return (workItem.firstSubmitterId ?? workItem.creatorId) === user.id
  }
  if (workItem.creatorId === user.id) return true
  if ((workItem.firstSubmitterId ?? workItem.creatorId) === user.id) {
    return true
  }

  return false
}

export function canCreateWork(user: PermissionUser): boolean {
  return isSupervisor(user.role) || isDepartmentLevel(user.role)
}

export function canDeleteWork(user: PermissionUser): boolean {
  return isAdmin(user.role)
}
