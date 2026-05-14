import {
  Prisma,
  Role,
  type User,
  WorkItemStatus,
  WorkItemType,
  ApprovalType,
} from '@prisma/client'
import { isReturnedDraftWork, isReturnedInProgressWork } from './work-status.rules'

const GLOBAL_VIEW_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR]
const DEPARTMENT_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]

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

function isGlobalViewRole(role: Role): boolean {
  return GLOBAL_VIEW_ROLES.includes(role)
}

function isDepartmentLevelRole(role: Role): boolean {
  return DEPARTMENT_ROLES.includes(role)
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

/** @deprecated Use getCooperatorDepartmentIds instead */
export function getCooperateDepartmentIds(
  workItem: PermissionWorkItem,
): number[] {
  return getCooperatorDepartmentIds(workItem)
}

export function isWorkRelatedToDepartment(
  workItem: PermissionWorkItem,
  departmentId?: number | null,
): boolean {
  if (!departmentId) return false
  return (
    getResponsibleDepartmentIds(workItem).includes(departmentId) ||
    getCooperateDepartmentIds(workItem).includes(departmentId)
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
  if (isGlobalViewRole(user.role)) {
    return {}
  }

  if (isDepartmentLevelRole(user.role)) {
    return {}
  }

  if (user.role === Role.VICE_PRESIDENT) {
    return {
      OR: [
        { proposedLeaderId: user.id },
        { approvalLeaderId: user.id },
        { currentApproverId: user.id },
      ],
    }
  }

  if (user.role === Role.PRESIDENT) {
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
  if (isGlobalViewRole(user.role)) return true

  if (isDepartmentLevelRole(user.role)) {
    return (
      isWorkRelatedToDepartment(workItem, user.departmentId) ||
      workItem.currentApproverId === user.id
    )
  }

  if (user.role === Role.VICE_PRESIDENT) {
    return (
      workItem.proposedLeaderId === user.id ||
      workItem.approvalLeaderId === user.id ||
      workItem.currentApproverId === user.id
    )
  }

  if (user.role === Role.PRESIDENT) {
    return (
      workItem.proposedLeaderId === user.id ||
      workItem.approvalLeaderId === user.id ||
      workItem.currentApproverId === user.id ||
      workItem.currentApproverRole === Role.PRESIDENT ||
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
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return false
  if (
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
    user.role === Role.DEPARTMENT_LEADER ||
    user.role === Role.DEPARTMENT_MANAGER
  ) {
    return (
      currentApproverRole === user.role &&
      isWorkMainResponsibleDepartment(workItem, user.departmentId)
    )
  }

  if (user.role === Role.PRESIDENT) {
    return (
      currentApproverRole === Role.PRESIDENT ||
      (!currentApproverRole && workItem.needMainLeaderCancel === true)
    )
  }

  if (user.role === Role.VICE_PRESIDENT) {
    if (currentApproverRole === Role.VICE_PRESIDENT) {
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
 * This is the foundation — canHandleWorkItem builds on it by narrowing.
 */
export function canOperateWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true

  const status = normalizeStatus(workItem.status)
  if (status === 'COMPLETED' || status === 'CANCELLED') return false

  const ownerId = workItem.firstSubmitterId ?? workItem.creatorId

  if (isDepartmentLevelRole(user.role)) {
    if (isWorkMainResponsibleDepartment(workItem, user.departmentId)) {
      if (
        status === WorkItemStatus.IN_PROGRESS ||
        status === WorkItemStatus.PENDING_DECOMPOSE
      )
        return true
      if (status === WorkItemStatus.DRAFT && workItem.creatorId === user.id)
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
export function canHandleWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return false
  if (!canOperateWorkItem(user, workItem)) return false

  const status = normalizeStatus(workItem.status)
  const ownerId = workItem.firstSubmitterId ?? workItem.creatorId

  if (status === WorkItemStatus.IN_PROGRESS)
    return isReturnedInProgressWork(workItem) && ownerId === user.id

  if (
    status === WorkItemStatus.DRAFT &&
    !isReturnedDraftWork(workItem) &&
    isDepartmentLevelRole(user.role) &&
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

  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true
  if (returnedDraft) {
    return (workItem.firstSubmitterId ?? workItem.creatorId) === user.id
  }
  if (workItem.creatorId === user.id) return true
  if ((workItem.firstSubmitterId ?? workItem.creatorId) === user.id) {
    return true
  }

  return (
    isDepartmentLevelRole(user.role) &&
    isWorkMainResponsibleDepartment(workItem, user.departmentId)
  )
}

export function canCreateWork(user: PermissionUser): boolean {
  const IMPORT_EXPORT_ROLES: Role[] = [
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.DEPARTMENT_MANAGER,
    Role.DEPARTMENT_LEADER,
  ]
  return IMPORT_EXPORT_ROLES.includes(user.role) && user.role !== Role.ADMIN
}

export function canDeleteWork(user: PermissionUser): boolean {
  return user.role === Role.ADMIN
}
