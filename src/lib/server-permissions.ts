
import { Role, User, WorkItem } from '@prisma/client'
import prisma from './prisma'

const COMPANY_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.VICE_PRESIDENT, Role.PRESIDENT]
const DEPT_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]
const IMPORT_EXPORT_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]

export async function canAccessWorkItem(user: User, workItem: WorkItem): Promise<boolean> {
  // 公司级角色（ADMIN/SUPERVISOR/VICE_PRESIDENT/PRESIDENT）可以查看所有事项
  if (isCompanyLevelRole(user.role)) {
    return true
  }

  // 单选部门匹配
  if (workItem.departmentId === user.departmentId) {
    return true
  }

  // 多选部门匹配（待办事项的 departmentIds）
  if (workItem.departmentIds.includes(user.departmentId)) {
    return true
  }

  // 配合部门匹配（待办事项的 cooperateDepartmentIds）
  if (workItem.cooperateDepartmentIds.includes(user.departmentId)) {
    return true
  }

  return false
}

export async function canEditWorkItem(user: User, workItem: WorkItem): Promise<boolean> {
  if (user.role === Role.ADMIN) {
    return true
  }

  if (user.id === workItem.creatorId) {
    return true
  }

  if (user.role === Role.DEPARTMENT_LEADER && workItem.departmentId === user.departmentId) {
    return true
  }

  return false
}

export async function canApproveWorkItem(user: User, workItem: WorkItem): Promise<boolean> {
  if (!workItem.currentApproverId && !workItem.currentApproverRole) {
    return false
  }

  if (workItem.currentApproverId === user.id) {
    return true
  }

  if (workItem.currentApproverRole === user.role) {
    if (workItem.currentApproverRole === Role.DEPARTMENT_LEADER) {
      return workItem.departmentId === user.departmentId
    }

    if (workItem.currentApproverRole === Role.VICE_PRESIDENT) {
      return user.role === Role.VICE_PRESIDENT
    }

    if (workItem.currentApproverRole === Role.PRESIDENT) {
      return user.role === Role.PRESIDENT
    }
  }

  return false
}

export async function getDepartmentIdsForUser(user: User): Promise<number[]> {
  if (isCompanyLevelRole(user.role)) {
    const departments = await prisma.department.findMany({
      where: { isBusiness: true },
      select: { id: true },
    })
    return departments.map(d => d.id)
  }

  return [user.departmentId]
}

export function isCompanyLevelRole(role: Role): boolean {
  return COMPANY_ROLES.includes(role)
}

export function isDepartmentLevelRole(role: Role): boolean {
  return DEPT_ROLES.includes(role)
}

export function canImportData(user: User): boolean {
  return IMPORT_EXPORT_ROLES.includes(user.role)
}

export function canExportData(user: User): boolean {
  return IMPORT_EXPORT_ROLES.includes(user.role)
}

export function canCreateWork(user: User): boolean {
  return IMPORT_EXPORT_ROLES.includes(user.role) && user.role !== Role.ADMIN
}

export function canDeleteWork(user: User): boolean {
  return user.role === Role.ADMIN
}
