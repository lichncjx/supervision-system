import {
  Role,
  type User,
  WorkItemStatus,
  WorkItemType,
  ApprovalType,
} from '@prisma/client'
import { isReturnedDraftWork, isReturnedInProgressWork, isApproving, isTerminal, isHandling } from './work-status.rules'
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
  if (isGlobalView(user.role)) return false

  if (!isApproving(workItem.status)) return false

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
  const ownerId = workItem.firstSubmitterId ?? workItem.creatorId
  const isOwner = ownerId === user.id

  // Only allows DRAFT/IN_PROGRESS/PENDING_DECOMPOSE, excluding terminal states and approving states.
  if (!isHandling(status)) return false

  if (isCompanyLevel(user.role))
    return isOwner && status === WorkItemStatus.DRAFT

  const pendingMainDepartmentDecompose =
    status === WorkItemStatus.PENDING_DECOMPOSE &&
    isWorkMainResponsibleDepartment(workItem, user.departmentId)
  return isOwner || pendingMainDepartmentDecompose
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
  if (!canOperateWorkItem(user, workItem)) return false

  const status = normalizeStatus(workItem.status)
  if (status === WorkItemStatus.IN_PROGRESS)
    return isReturnedInProgressWork(workItem)

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
