import type { User } from '@/lib/auth';

export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  DEPARTMENT_MANAGER: 'department_manager',
  DEPARTMENT_LEADER: 'department_leader',
  VICE_PRESIDENT: 'vice_president',
  PRESIDENT: 'president',
} as const;

export function hasPermission(user: User | null, requiredRoles: string[]) {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

export function canAccessDepartment(user: User | null, departmentId: number) {
  if (!user) return false;

  if (
    user.role === ROLES.ADMIN ||
    user.role === ROLES.SUPERVISOR ||
    user.role === ROLES.VICE_PRESIDENT ||
    user.role === ROLES.PRESIDENT ||
    user.department_id === 1
  ) {
    return true;
  }

  return user.department_id === departmentId;
}

export function canApprove(user: User | null, approvalLevel: number) {
  if (!user) return false;

  switch (approvalLevel) {
    case 1:
      return user.role === ROLES.DEPARTMENT_LEADER;
    case 2:
      return user.role === ROLES.VICE_PRESIDENT || user.role === ROLES.PRESIDENT;
    case 3:
      return user.role === ROLES.PRESIDENT;
    default:
      return false;
  }
}

export function canPerformAction(user: User | null, action: string) {
  if (!user) return false;

  // 系统管理员最高权限，可以执行所有操作
  if (user.role === ROLES.ADMIN) {
    return true;
  }

  const actions: Record<string, string[]> = {
    create_item: [
      ROLES.DEPARTMENT_MANAGER,
      ROLES.DEPARTMENT_LEADER,
    ],
    complete_item: [
      ROLES.DEPARTMENT_MANAGER,
      ROLES.DEPARTMENT_LEADER,
    ],
    adjust_item: [
      ROLES.DEPARTMENT_MANAGER,
      ROLES.DEPARTMENT_LEADER,
    ],
    cancel_item: [
      ROLES.DEPARTMENT_MANAGER,
      ROLES.DEPARTMENT_LEADER,
    ],
    create_todo: [
      ROLES.DEPARTMENT_MANAGER,
      ROLES.DEPARTMENT_LEADER,
      ROLES.VICE_PRESIDENT,
      ROLES.PRESIDENT,
    ],
    decompose_todo: [
      ROLES.DEPARTMENT_MANAGER,
      ROLES.DEPARTMENT_LEADER,
    ],
    manage_users: [ROLES.ADMIN],
    manage_departments: [ROLES.ADMIN],
    export_stats: [ROLES.SUPERVISOR],
    edit_notice: [ROLES.SUPERVISOR],
  };

  return actions[action]?.includes(user.role) || false;
}

export function getAvailableMenus(user: User | null) {
  if (!user) return [];

  const baseMenus = [
    { name: '首页', href: '/', icon: 'Home' },
    { name: '重点工作', href: '/priority', icon: 'AlertCircle' },
    { name: '主要工作', href: '/main', icon: 'Calendar' },
    { name: '待办事项', href: '/todo', icon: 'CheckSquare' },
    { name: '待我处理', href: '/approval', icon: 'FileText' },
  ];

  if (user.role === ROLES.ADMIN) {
    baseMenus.push({ name: '系统管理', href: '/admin', icon: 'Settings' });
  }

  return baseMenus;
}