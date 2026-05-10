import { Role } from '@prisma/client'

export { hashPassword, verifyPassword } from '@/shared/auth/password'
export { generateToken, verifyToken } from '@/shared/auth/jwt'
export { getUserFromToken } from '@/shared/auth/get-current-user'

const COMPANY_ROLES: Role[] = [
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.VICE_PRESIDENT,
  Role.PRESIDENT,
]
const DEPT_ROLES: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]
const APPROVE_DEPT_ROLES: Role[] = [Role.DEPARTMENT_LEADER]
const APPROVE_COMPANY_ROLES: Role[] = [Role.VICE_PRESIDENT, Role.PRESIDENT]
const IMPORT_EXPORT_ROLES: Role[] = [
  Role.ADMIN,
  Role.SUPERVISOR,
  Role.DEPARTMENT_MANAGER,
  Role.DEPARTMENT_LEADER,
]

export function isCompanyLevelRole(role: Role): boolean {
  return COMPANY_ROLES.includes(role)
}

export function isDepartmentLevelRole(role: Role): boolean {
  return DEPT_ROLES.includes(role)
}

export function canApproveDepartmentLevel(role: Role): boolean {
  return APPROVE_DEPT_ROLES.includes(role)
}

export function canApproveCompanyLevel(role: Role): boolean {
  return APPROVE_COMPANY_ROLES.includes(role)
}

export function canApproveMainLeaderCancel(role: Role): boolean {
  return role === Role.PRESIDENT
}

export function canImportExport(role: Role): boolean {
  return IMPORT_EXPORT_ROLES.includes(role)
}

export function isSupervisionAdmin(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPERVISOR
}

export function canCreateWorkItem(role: Role): boolean {
  return !IMPORT_EXPORT_ROLES.includes(role) || role === Role.ADMIN
}

export function canAccessAllData(role: Role): boolean {
  return COMPANY_ROLES.includes(role)
}
