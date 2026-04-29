// 客户端权限检查函数 - 可在客户端组件中使用
// 不导入任何服务端模块

export type Role =
  | 'admin'
  | 'supervisor'
  | 'department_manager'
  | 'department_leader'
  | 'vice_president'
  | 'president';

export interface Item {
  id: number;
  type: string;
  title: string;
  status: string;
  department_id?: number;
  department_ids?: number[];
  created_by?: number;
}

export function canViewAll(role: Role): boolean {
  return (
    role === 'admin' ||
    role === 'supervisor' ||
    role === 'vice_president' ||
    role === 'president'
  );
}

export function canViewDepartment(role: Role): boolean {
  return true;
}

export function canApprove(role: Role): boolean {
  return role === 'admin' || role === 'department_leader' || role === 'vice_president' || role === 'president';
}

export function canApproveDepartmentLevel(role: Role): boolean {
  return role === 'admin' || role === 'department_leader';
}

export function canApproveCompanyLevel(role: Role): boolean {
  return role === 'admin' || role === 'vice_president' || role === 'president';
}

export function canCreate(role: Role): boolean {
  return role === 'admin' || role === 'department_manager' || role === 'department_leader';
}

export function canCreateTodo(role: Role): boolean {
  return (
    role === 'admin' ||
    role === 'department_manager' ||
    role === 'department_leader' ||
    role === 'vice_president' ||
    role === 'president'
  );
}

export function canEditItem(role: Role, item: Item, userId: number): boolean {
  if (role === 'admin') return true;
  if (item.created_by === userId && item.status === 'draft') return true;
  return false;
}