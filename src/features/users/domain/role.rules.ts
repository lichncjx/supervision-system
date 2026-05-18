type RoleLike = string | { toString(): string } | null | undefined

function normalize(role: RoleLike): string {
  return String(role ?? '').toUpperCase()
}

export function isAdmin(role: RoleLike): boolean {
  return normalize(role) === 'ADMIN'
}

export function isSupervisor(role: RoleLike): boolean {
  return normalize(role) === 'SUPERVISOR'
}

export function isVicePresident(role: RoleLike): boolean {
  return normalize(role) === 'VICE_PRESIDENT'
}

export function isPresident(role: RoleLike): boolean {
  return normalize(role) === 'PRESIDENT'
}

export function isDeptManager(role: RoleLike): boolean {
  return normalize(role) === 'DEPARTMENT_MANAGER'
}

export function isDeptLeader(role: RoleLike): boolean {
  return normalize(role) === 'DEPARTMENT_LEADER'
}

export function isGlobalView(role: RoleLike): boolean {
  return isAdmin(role) || isSupervisor(role)
}

export function isCompanyLevel(role: RoleLike): boolean {
  return isVicePresident(role) || isPresident(role)
}

export function isDepartmentLevel(role: RoleLike): boolean {
  return isDeptManager(role) || isDeptLeader(role)}

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
