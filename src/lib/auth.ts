
export type Role =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'DEPARTMENT_MANAGER'
  | 'DEPARTMENT_LEADER'
  | 'VICE_PRESIDENT'
  | 'PRESIDENT';

export interface User {
  id: number;
  username: string;
  name: string;
  role: Role;
  departmentId: number;
  departmentName: string;
  isActive: boolean;
  email?: string;
  phone?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  isBusiness: boolean;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: User;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || '登录失败' };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        role: data.user.role as Role,
        departmentId: data.user.departmentId,
        departmentName: data.user.departmentName,
        isActive: data.user.isActive,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: '网络错误，请稍后重试' };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role as Role,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      isActive: data.isActive,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oldPassword, newPassword }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || '修改密码失败' };
    }

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: '网络错误，请稍后重试' };
  }
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
  };
  return map[role] || role;
}

export function isCompanyLevel(role?: string, departmentId?: number): boolean {
  const upperRole = role?.toUpperCase();
  return (
    upperRole === 'ADMIN' ||
    upperRole === 'SUPERVISOR' ||
    upperRole === 'VICE_PRESIDENT' ||
    upperRole === 'PRESIDENT' ||
    departmentId === 1
  );
}

export function isCompanyApprovalLeader(role?: string): boolean {
  const upperRole = role?.toUpperCase();
  return upperRole === 'VICE_PRESIDENT' || upperRole === 'PRESIDENT';
}

export function isPresident(role?: string): boolean {
  const upperRole = role?.toUpperCase();
  return upperRole === 'PRESIDENT';
}

export function isDepartmentApprover(role?: string): boolean {
  const upperRole = role?.toUpperCase();
  return upperRole === 'DEPARTMENT_LEADER';
}

export function isAdmin(role?: string): boolean {
  const upperRole = role?.toUpperCase();
  return upperRole === 'ADMIN';
}

export function canImportExport(role?: string): boolean {
  const upperRole = role?.toUpperCase();
  return (
    upperRole === 'ADMIN' ||
    upperRole === 'SUPERVISOR' ||
    upperRole === 'DEPARTMENT_MANAGER' ||
    upperRole === 'DEPARTMENT_LEADER'
  );
}

let departmentsCache: Department[] | null = null;

export async function getDepartments(): Promise<Department[]> {
  if (departmentsCache) {
    return departmentsCache;
  }

  try {
    const response = await fetch('/api/departments', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    departmentsCache = await response.json();
    return departmentsCache || [];
  } catch {
    return [];
  }
}

export async function getDepartmentName(departmentId: number): Promise<string> {
  const depts = await getDepartments();
  return depts.find((d) => d.id === departmentId)?.name || '-';
}

export async function getCompanyLeaders() {
  try {
    const response = await fetch('/api/users/company-leaders', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function getUsersByDepartment(departmentId: number) {
  try {
    const response = await fetch(`/api/users/by-department?departmentId=${departmentId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function getDepartmentLeaders(departmentId: number) {
  try {
    const response = await fetch(`/api/users/department-leaders?departmentId=${departmentId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export async function getDepartmentManagers(departmentId: number) {
  try {
    const response = await fetch(`/api/users/department-managers?departmentId=${departmentId}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
}

export function clearDepartmentsCache() {
  departmentsCache = null;
}