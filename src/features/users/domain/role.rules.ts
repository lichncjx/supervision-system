export const COMPANY_ROLES = [
  'ADMIN',
  'SUPERVISOR',
  'VICE_PRESIDENT',
  'PRESIDENT',
] as const

export const DEPT_ROLES = ['DEPARTMENT_MANAGER', 'DEPARTMENT_LEADER'] as const

export const APPROVE_DEPT_ROLES = ['DEPARTMENT_LEADER'] as const

export const APPROVE_COMPANY_ROLES = [
  'VICE_PRESIDENT',
  'PRESIDENT',
] as const

export const IMPORT_EXPORT_ROLES = [
  'ADMIN',
  'SUPERVISOR',
  'DEPARTMENT_MANAGER',
  'DEPARTMENT_LEADER',
] as const

export const GLOBAL_VIEW_ROLES = ['ADMIN', 'SUPERVISOR'] as const

type RoleLike = string | { toString(): string } | null | undefined

function normalize(role: RoleLike): string {
  return String(role ?? '').toUpperCase()
}

export function isCompanyLevelRole(role: RoleLike): boolean {
  return (COMPANY_ROLES as readonly string[]).includes(normalize(role))
}

/** Based on role only — no departmentId check. Second parameter kept for backward compat. */
export function isCompanyLevel(role: RoleLike, _departmentId?: number): boolean {
  return isCompanyLevelRole(role)
}

export function isDepartmentLevelRole(role: RoleLike): boolean {
  return (DEPT_ROLES as readonly string[]).includes(normalize(role))
}

export function isGlobalViewRole(role: RoleLike): boolean {
  return (GLOBAL_VIEW_ROLES as readonly string[]).includes(normalize(role))
}

/** Alias for isGlobalViewRole */
export const isSupervisionAdmin = isGlobalViewRole

export function isAdmin(role: RoleLike): boolean {
  return normalize(role) === 'ADMIN'
}

export function isPresident(role: RoleLike): boolean {
  return normalize(role) === 'PRESIDENT'
}

export function canApproveDepartmentLevel(role: RoleLike): boolean {
  return (APPROVE_DEPT_ROLES as readonly string[]).includes(normalize(role))
}

/** Alias for canApproveDepartmentLevel */
export const isDepartmentApprover = canApproveDepartmentLevel

export function canApproveCompanyLevel(role: RoleLike): boolean {
  return (APPROVE_COMPANY_ROLES as readonly string[]).includes(normalize(role))
}

/** Alias for canApproveCompanyLevel */
export const isCompanyApprovalLeader = canApproveCompanyLevel

export function canApproveMainLeaderCancel(role: RoleLike): boolean {
  return normalize(role) === 'PRESIDENT'
}

export function canImportExport(role: RoleLike): boolean {
  return (IMPORT_EXPORT_ROLES as readonly string[]).includes(normalize(role))
}

/** Alias for canImportExport */
export const canImportData = canImportExport

/** Alias for canImportExport */
export const canExportData = canImportExport

export function canCreateWorkItem(role: RoleLike): boolean {
  const r = normalize(role)
  return !(IMPORT_EXPORT_ROLES as readonly string[]).includes(r) || r === 'ADMIN'
}

export function canAccessAllData(role: RoleLike): boolean {
  return (COMPANY_ROLES as readonly string[]).includes(normalize(role))
}

export function getRoleName(role: string): string {
  const map: Record<string, string> = {
    ADMIN: '系统管理员',
    SUPERVISOR: '督办管理员',
    DEPARTMENT_MANAGER: '部门主管',
    DEPARTMENT_LEADER: '部门领导',
    VICE_PRESIDENT: '公司主管领导',
    PRESIDENT: '公司主要领导',
    admin: '系统管理员',
    supervisor: '督办管理员',
    department_manager: '部门主管',
    department_leader: '部门领导',
    vice_president: '公司主管领导',
    president: '公司主要领导',
  }
  return map[role] || role
}
