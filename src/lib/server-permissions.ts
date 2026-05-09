
import { Prisma, Role, User, WorkItem } from '@prisma/client'
import prisma from './prisma'
import {
  getTargetWorkItemStatus,
  isTargetApprovalStatus,
} from './work-item-status'

const COMPANY_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.VICE_PRESIDENT, Role.PRESIDENT]
const GLOBAL_VIEW_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR]
const DEPT_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]
const IMPORT_EXPORT_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]

type WorkItemWithFutureFields = WorkItem & {
  responsibleDepartmentIds?: number[] | null
}

function normalizeIds(values: unknown): number[] {
  if (!Array.isArray(values)) return []
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)
}

export function getResponsibleDepartmentIds(workItem: WorkItemWithFutureFields): number[] {
  const futureIds = normalizeIds(workItem.responsibleDepartmentIds)
  if (futureIds.length > 0) return futureIds

  const currentIds = normalizeIds(workItem.departmentIds)
  if (currentIds.length > 0) return currentIds

  return workItem.departmentId ? [workItem.departmentId] : []
}

export function getCooperateDepartmentIds(workItem: WorkItem): number[] {
  return normalizeIds(workItem.cooperateDepartmentIds)
}

export function isMainResponsibleDepartment(workItem: WorkItemWithFutureFields, departmentId: number): boolean {
  return getResponsibleDepartmentIds(workItem).includes(departmentId)
}

export function isWorkRelatedToDepartment(workItem: WorkItemWithFutureFields, departmentId: number): boolean {
  return (
    isMainResponsibleDepartment(workItem, departmentId) ||
    getCooperateDepartmentIds(workItem).includes(departmentId)
  )
}

export function canViewWorkItem(user: User, workItem: WorkItemWithFutureFields): boolean {
  if (isGlobalViewRole(user.role)) {
    return true
  }

  if (isDepartmentLevelRole(user.role)) {
    return isWorkRelatedToDepartment(workItem, user.departmentId)
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

export function canAccessWorkItem(user: User, workItem: WorkItemWithFutureFields): boolean {
  return canViewWorkItem(user, workItem)
}

export function buildWorkItemVisibilityWhere(user: User): Prisma.WorkItemWhereInput {
  if (isGlobalViewRole(user.role)) {
    return {}
  }

  if (isDepartmentLevelRole(user.role)) {
    return {
      OR: [
        { departmentId: user.departmentId },
        { departmentIds: { has: user.departmentId } },
        { cooperateDepartmentIds: { has: user.departmentId } },
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

export function canApproveWorkItem(user: User, workItem: WorkItemWithFutureFields): boolean {
  if (!isTargetApprovalStatus(workItem.status)) {
    return false
  }

  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) {
    return false
  }

  if (!workItem.currentApproverId && !workItem.currentApproverRole) {
    return false
  }

  if (workItem.currentApproverId === user.id) {
    return true
  }

  if (workItem.currentApproverRole === user.role) {
    if (isDepartmentLevelRole(user.role)) {
      return isMainResponsibleDepartment(workItem, user.departmentId)
    }

    return true
  }

  return false
}

export function canHandleWorkItem(user: User, workItem: WorkItemWithFutureFields): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) {
    return false
  }

  if (!isDepartmentLevelRole(user.role)) {
    return false
  }

  if (!isMainResponsibleDepartment(workItem, user.departmentId)) {
    return false
  }

  const targetStatus = getTargetWorkItemStatus(workItem.status)

  if (targetStatus === 'DRAFT') {
    if (workItem.status === 'REJECTED' && workItem.firstSubmitterId) {
      return workItem.firstSubmitterId === user.id
    }

    return true
  }

  return targetStatus === 'PENDING_DECOMPOSE' || targetStatus === 'IN_PROGRESS'
}

export async function getDepartmentIdsForUser(user: User): Promise<number[]> {
  if (isGlobalViewRole(user.role)) {
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

export function isGlobalViewRole(role: Role): boolean {
  return GLOBAL_VIEW_ROLES.includes(role)
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
