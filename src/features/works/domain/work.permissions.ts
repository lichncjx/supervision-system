import {
  Prisma,
  Role,
  type User,
  WorkItemStatus,
  WorkItemType,
  ApprovalType,
} from '@prisma/client'
import { isReturnedDraftWork, isReturnedInProgressWork, isWorkStatusApproving } from './work-status.rules'
import { isGlobalView, isDepartmentLevel, isCompanyLevel, isPresident, isVicePresident } from '@/features/users/domain/role.rules'

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
}

/** 去重 + 过滤非正数 ID */
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

/** 主责部门 ID 列表（当前仅 departmentId 一个） */
export function getResponsibleDepartmentIds(
  workItem: PermissionWorkItem,
): number[] {
  return uniquePositiveIds([workItem.departmentId])
}

/** 配合部门 ID 列表，从 JSONB cooperators 数组提取 */
export function getCooperatorDepartmentIds(
  workItem: PermissionWorkItem,
): number[] {
  const cooperators = workItem.cooperators
  if (!Array.isArray(cooperators)) return []
  return uniquePositiveIds(
    cooperators.map((c: any) => c?.departmentId).filter(Boolean),
  )
}

/** 事项是否与指定部门有关联（主责 或 配合） */
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

/** 事项的主责部门是否为指定部门（仅 departmentId，不含配合） */
export function isWorkMainResponsibleDepartment(
  workItem: PermissionWorkItem,
  departmentId?: number | null,
): boolean {
  if (!departmentId) return false
  return getResponsibleDepartmentIds(workItem).includes(departmentId)
}

/**
 * Broad view permission for listing and detail viewing. Does not guarantee actionable permissions.
 *
 * - Global view (ADMIN/SUPERVISOR) can see all items.
 */
export function canViewWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (isGlobalView(user.role)) return true

  if (isDepartmentLevel(user.role))
    return isWorkRelatedToDepartment(workItem, user.departmentId)

  if (isCompanyLevel(user.role)) {
    return (
      workItem.proposedLeaderId === user.id ||
      workItem.approvalLeaderId === user.id ||
      workItem.currentApproverId === user.id
    )
  }

  return false
}

export function canApproveWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (isGlobalView(user.role))
    return false

  if (!isWorkStatusApproving(workItem.status))
    return false

  if (workItem.currentApproverId) {
    return workItem.currentApproverId === user.id
  }

  const currentApproverRole = workItem.currentApproverRole as Role | string | null | undefined
  if (currentApproverRole && currentApproverRole !== user.role) {
    return false
  }

  if (isDepartmentLevel(user.role)) {
    return !!currentApproverRole && isWorkMainResponsibleDepartment(workItem, user.departmentId)
  }

  if (isPresident(user.role)) {
    return !!currentApproverRole
  }

  if (isVicePresident(user.role)) {
    return !!currentApproverRole && (
      !workItem.proposedLeaderId ||
      workItem.proposedLeaderId === user.id ||
      workItem.approvalLeaderId === user.id
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

  // Non-department roles: operate on own non-terminal items (PENDING_DECOMPOSE is department-only)
  if (ownerId !== user.id) return false
  return status !== 'COMPLETED' && status !== 'CANCELLED' && status !== WorkItemStatus.PENDING_DECOMPOSE
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
