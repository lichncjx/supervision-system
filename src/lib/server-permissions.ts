import { Role, WorkItemStatus } from '@prisma/client'
import prisma from './prisma'
import {
  canViewWorkItem,
  canHandleWorkItem,
  type PermissionUser,
  type PermissionWorkItem,
} from '@/features/works/domain/work.permissions'

const GLOBAL_VIEW_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR]
const DEPARTMENT_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]
const IMPORT_EXPORT_ROLES: Role[] = [
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.DEPARTMENT_MANAGER,
  Role.DEPARTMENT_LEADER,
]

const TERMINAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETED,
  WorkItemStatus.CANCELLED,
]

export {
  canViewWorkItem,
  canAccessWorkItem,
  canApproveWorkItem,
  canHandleWorkItem,
  canEditWorkItem,
  canCreateWork,
  canDeleteWork,
  getResponsibleDepartmentIds,
  getCooperatorDepartmentIds,
  getCooperateDepartmentIds,
  isWorkRelatedToDepartment,
  isWorkMainResponsibleDepartment,
  buildWorkVisibilityWhere,
} from '@/features/works/domain/work.permissions'
export type {
  PermissionUser,
  PermissionWorkItem,
} from '@/features/works/domain/work.permissions'

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

export function canUploadAttachment(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true
  if (
    TERMINAL_STATUSES.includes(
      String(workItem.status || '').toUpperCase() as WorkItemStatus,
    )
  )
    return false

  return canHandleWorkItem(user, workItem)
}

export function canViewAttachment(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
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

export async function getDepartmentIdsForUser(
  user: PermissionUser,
): Promise<number[]> {
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
