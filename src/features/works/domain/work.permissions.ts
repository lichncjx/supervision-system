import {
  Role,
  type User,
  WorkItemStatus,
  WorkItemType,
  ApprovalType,
} from '@prisma/client'
import { isReturnedInProgressWork, isApproving } from './work-status.rules'
import { isGlobalView, isDepartmentLevel, isCompanyLevel, isDeptLeader } from '@/features/users/domain/role.rules'

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
  responsiblePersonUserId?: number | null
  responsibleLeaderUserId?: number | null
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
  if (isGlobalView(user.role)) return false

  if (!isApproving(workItem.status)) return false

  if (workItem.currentApproverId)
    return workItem.currentApproverId === user.id

  const currentApproverRole = workItem.currentApproverRole as Role | string | null | undefined
  if (!currentApproverRole || currentApproverRole !== user.role)
    return false

  if (isCompanyLevel(user.role))
    return workItem.proposedLeaderId === user.id || workItem.approvalLeaderId === user.id

  return isDeptLeader(user.role) && isWorkMainResponsibleDepartment(workItem, user.departmentId)
}

/**
 * Business operation permission for workflow actions.
 *
 * This is state-aware:
 * - DRAFT: draft owner submits/edits the draft.
 * - PENDING_DECOMPOSE: main responsible department decomposes the todo.
 * - IN_PROGRESS: responsiblePersonUserId submits completion/adjust/cancel.
 *
 * Global view does not grant business operation permission; each branch must
 * match the concrete actor required by that state.
 * Attachment management has separate permission rules.
 */
export function canOperateWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  switch (normalizeStatus(workItem.status)) {
    case WorkItemStatus.DRAFT:
      return (workItem.firstSubmitterId ?? workItem.creatorId) === user.id
    case WorkItemStatus.PENDING_DECOMPOSE:
      return isDepartmentLevel(user.role)
        && isWorkMainResponsibleDepartment(workItem, user.departmentId)
    case WorkItemStatus.IN_PROGRESS:
      return workItem.responsiblePersonUserId === user.id
    default:
      return false
  }
}

/**
 * Narrow handling check — only items that require immediate user action (待办理).
 *
 * Builds on canOperateWorkItem and further narrows:
 * - IN_PROGRESS only counts when returned from approval (rejected adjust/cancel/complete).
 */
export function shouldHandleWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  return canOperateWorkItem(user, workItem)
    && (normalizeStatus(workItem.status) !== WorkItemStatus.IN_PROGRESS
      || isReturnedInProgressWork(workItem))
}

export function canEditWorkItem(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (normalizeStatus(workItem.status) !== WorkItemStatus.DRAFT) return false

  return (workItem.firstSubmitterId ?? workItem.creatorId) === user.id
}
