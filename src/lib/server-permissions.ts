import { ApprovalType, Prisma, Role, User, WorkItemStatus, WorkItemType } from '@prisma/client'
import prisma from './prisma'
import { isReturnedDraftWork } from './work-status'

const GLOBAL_VIEW_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR]
const DEPARTMENT_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]
const IMPORT_EXPORT_ROLES: Role[] = [
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.DEPARTMENT_MANAGER,
  Role.DEPARTMENT_LEADER,
]

const APPROVAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
]

const TERMINAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETED,
  WorkItemStatus.CANCELLED,
]

export type PermissionUser = Pick<User, 'id' | 'role' | 'departmentId'>

export interface PermissionWorkItem {
  id?: number
  type?: WorkItemType | string
  status?: WorkItemStatus | string
  departmentId?: number | null
  responsibleDepartmentIds?: number[] | null
  cooperateDepartmentIds?: number[] | null
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

export function getResponsibleDepartmentIds(workItem: PermissionWorkItem): number[] {
  if (
    Array.isArray(workItem.responsibleDepartmentIds) &&
    workItem.responsibleDepartmentIds.length > 0
  ) {
    return uniquePositiveIds(workItem.responsibleDepartmentIds)
  }

  return uniquePositiveIds([workItem.departmentId])
}

export function getCooperateDepartmentIds(workItem: PermissionWorkItem): number[] {
  return Array.isArray(workItem.cooperateDepartmentIds)
    ? uniquePositiveIds(workItem.cooperateDepartmentIds)
    : []
}

export function isGlobalViewRole(role: Role): boolean {
  return GLOBAL_VIEW_ROLES.includes(role)
}

export function isCompanyLevelRole(role: Role): boolean {
  return (
    role === Role.ADMIN ||
    role === Role.SUPERVISOR ||
    role === Role.VICE_PRESIDENT ||
    role === Role.PRESIDENT
  )
}

export function isDepartmentLevelRole(role: Role): boolean {
  return DEPARTMENT_ROLES.includes(role)
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

export function buildWorkVisibilityWhere(user: PermissionUser): Prisma.WorkItemWhereInput {
  if (isGlobalViewRole(user.role)) {
    return {}
  }

  if (isDepartmentLevelRole(user.role)) {
    return {
      OR: [
        { departmentId: user.departmentId },
        { responsibleDepartmentIds: { has: user.departmentId } },
        { cooperateDepartmentIds: { has: user.departmentId } },
        { currentApproverId: user.id },
      ],
    }
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

export function canViewWorkItem(user: PermissionUser, workItem: PermissionWorkItem): boolean {
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

export function canAccessWorkItem(user: PermissionUser, workItem: PermissionWorkItem): boolean {
  return canViewWorkItem(user, workItem)
}

export function canApproveWorkItem(user: PermissionUser, workItem: PermissionWorkItem): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return false
  if (!APPROVAL_STATUSES.includes(normalizeStatus(workItem.status) as WorkItemStatus)) return false

  if (workItem.currentApproverId) {
    return workItem.currentApproverId === user.id
  }

  const currentApproverRole = workItem.currentApproverRole as Role | string | null | undefined
  if (currentApproverRole && currentApproverRole !== user.role) {
    return false
  }

  if (user.role === Role.DEPARTMENT_LEADER || user.role === Role.DEPARTMENT_MANAGER) {
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
      (
        workItem.approvalLeaderId === user.id ||
        workItem.proposedLeaderId === user.id
      )
    )
  }

  return false
}

export function canHandleWorkItem(user: PermissionUser, workItem: PermissionWorkItem): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return false

  const status = normalizeStatus(workItem.status)
  const returnedDraftOwnerId = workItem.firstSubmitterId ?? workItem.creatorId
  const returnedDraft = isReturnedDraftWork(workItem)

  if (status === WorkItemStatus.DRAFT && returnedDraft) {
    return returnedDraftOwnerId === user.id
  }

  if (isDepartmentLevelRole(user.role)) {
    if (!isWorkMainResponsibleDepartment(workItem, user.departmentId)) return false
    if (status === WorkItemStatus.DRAFT && returnedDraftOwnerId === user.id) return true
    return (
      status === WorkItemStatus.DRAFT ||
      status === WorkItemStatus.PENDING_DECOMPOSE ||
      status === WorkItemStatus.IN_PROGRESS
    )
  }

  if (status === WorkItemStatus.DRAFT) {
    return returnedDraftOwnerId === user.id
  }

  return false
}

export function canEditWorkItem(user: PermissionUser, workItem: PermissionWorkItem): boolean {
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

export function canUploadAttachment(user: PermissionUser, workItem: PermissionWorkItem): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true
  if (TERMINAL_STATUSES.includes(normalizeStatus(workItem.status) as WorkItemStatus)) return false

  return canHandleWorkItem(user, workItem)
}

export function canViewAttachment(user: PermissionUser, workItem: PermissionWorkItem): boolean {
  return canViewWorkItem(user, workItem)
}

export function canDeleteAttachment(
  user: PermissionUser,
  _workItem: PermissionWorkItem,
  attachment: { userId: number },
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true
  return attachment.userId === user.id
}

export async function getDepartmentIdsForUser(user: PermissionUser): Promise<number[]> {
  if (isGlobalViewRole(user.role)) {
    const departments = await prisma.department.findMany({
      where: { isBusiness: true },
      select: { id: true },
    })
    return departments.map((department) => department.id)
  }

  return [user.departmentId]
}

export function canImportData(user: PermissionUser): boolean {
  return IMPORT_EXPORT_ROLES.includes(user.role)
}

export function canExportData(user: PermissionUser): boolean {
  return IMPORT_EXPORT_ROLES.includes(user.role)
}

export function canCreateWork(user: PermissionUser): boolean {
  return IMPORT_EXPORT_ROLES.includes(user.role) && user.role !== Role.ADMIN
}

export function canDeleteWork(user: PermissionUser): boolean {
  return user.role === Role.ADMIN
}
