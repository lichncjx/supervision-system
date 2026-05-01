
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

export const departments = [
  { id: 1, name: '公司领导组', code: 'LD', isBusiness: false },
  { id: 2, name: '综合处', code: 'ZH', isBusiness: true },
  { id: 3, name: '计划生产处', code: 'JH', isBusiness: true },
  { id: 4, name: '工艺技术处', code: 'GY', isBusiness: true },
  { id: 5, name: '信息档案中心', code: 'XX', isBusiness: true },
  { id: 6, name: '质量管理处', code: 'ZL', isBusiness: true },
  { id: 7, name: '人力资源处', code: 'RL', isBusiness: true },
  { id: 8, name: '综合财务处', code: 'CW', isBusiness: true },
  { id: 9, name: '设备管理处', code: 'SB', isBusiness: true },
  { id: 10, name: '行政保障处', code: 'XZ', isBusiness: true },
  { id: 11, name: '保密处', code: 'BM', isBusiness: true },
  { id: 12, name: '51车间', code: '51', isBusiness: true },
  { id: 13, name: '53车间', code: '53', isBusiness: true },
  { id: 14, name: '55车间', code: '55', isBusiness: true },
  { id: 15, name: '56车间', code: '56', isBusiness: true },
  { id: 16, name: '57车间', code: '57', isBusiness: true },
  { id: 17, name: '58车间', code: '58', isBusiness: true },
];

export function getDepartmentName(id: number): string {
  return departments.find((d) => d.id === id)?.name || '-';
}

export const companyLeadersStatic = [
  { id: 1001, name: '公司主要领导', role: 'PRESIDENT' },
  { id: 1002, name: '公司主管领导', role: 'VICE_PRESIDENT' },
];

export const departmentLeadersStatic = [
  { id: 2001, name: '综合处领导', departmentId: 2 },
  { id: 2002, name: '计划生产处领导', departmentId: 3 },
  { id: 2003, name: '工艺技术处领导', departmentId: 4 },
  { id: 2004, name: '信息档案中心领导', departmentId: 5 },
  { id: 2005, name: '质量管理处领导', departmentId: 6 },
  { id: 2006, name: '人力资源处领导', departmentId: 7 },
  { id: 2007, name: '综合财务处领导', departmentId: 8 },
  { id: 2008, name: '设备管理处领导', departmentId: 9 },
  { id: 2009, name: '行政保障处领导', departmentId: 10 },
  { id: 2010, name: '保密处领导', departmentId: 11 },
  { id: 2011, name: '51车间领导', departmentId: 12 },
  { id: 2012, name: '53车间领导', departmentId: 13 },
  { id: 2013, name: '55车间领导', departmentId: 14 },
  { id: 2014, name: '56车间领导', departmentId: 15 },
  { id: 2015, name: '57车间领导', departmentId: 16 },
  { id: 2016, name: '58车间领导', departmentId: 17 },
];

export const departmentManagersStatic = [
  { id: 3001, name: '综合处主管', departmentId: 2 },
  { id: 3002, name: '计划生产处主管', departmentId: 3 },
  { id: 3003, name: '工艺技术处主管', departmentId: 4 },
  { id: 3004, name: '信息档案中心主管', departmentId: 5 },
  { id: 3005, name: '质量管理处主管', departmentId: 6 },
  { id: 3006, name: '人力资源处主管', departmentId: 7 },
  { id: 3007, name: '综合财务处主管', departmentId: 8 },
  { id: 3008, name: '设备管理处主管', departmentId: 9 },
  { id: 3009, name: '行政保障处主管', departmentId: 10 },
  { id: 3010, name: '保密处主管', departmentId: 11 },
  { id: 3011, name: '51车间主管', departmentId: 12 },
  { id: 3012, name: '53车间主管', departmentId: 13 },
  { id: 3013, name: '55车间主管', departmentId: 14 },
  { id: 3014, name: '56车间主管', departmentId: 15 },
  { id: 3015, name: '57车间主管', departmentId: 16 },
  { id: 3016, name: '58车间主管', departmentId: 17 },
];

export function getUsersByDepartmentStatic(departmentId: number) {
  return [
    { id: 4000 + departmentId * 10 + 1, name: `${getDepartmentName(departmentId)}用户1`, departmentId },
    { id: 4000 + departmentId * 10 + 2, name: `${getDepartmentName(departmentId)}用户2`, departmentId },
  ];
}

export async function getCompanyLeaders() {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    const users = await response.json();
    return users
      .filter((user: any) => ['VICE_PRESIDENT', 'PRESIDENT'].includes(user.role))
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        role: user.role,
      }));
  } catch {
    return [];
  }
}

export async function getDepartmentLeaders() {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    const users = await response.json();
    return users
      .filter((user: any) => user.role === 'DEPARTMENT_LEADER')
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        departmentId: user.departmentId,
      }));
  } catch {
    return [];
  }
}

export async function getDepartmentManagers() {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    const users = await response.json();
    return users
      .filter((user: any) => user.role === 'DEPARTMENT_MANAGER')
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        departmentId: user.departmentId,
      }));
  } catch {
    return [];
  }
}

export async function getUsersByDepartment(departmentId: number) {
  try {
    const response = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) return [];
    const users = await response.json();
    return users
      .filter((user: any) => user.departmentId === departmentId)
      .map((user: any) => ({
        id: user.id,
        name: user.name,
      }));
  } catch {
    return [];
  }
}
