export type Role =
  | 'ADMIN'
  // SUPERVISOR = 督办管理员（系统级角色，全局查看/导入/导出），与事项业务责任人 responsiblePerson 无关
  | 'SUPERVISOR'
  | 'DEPARTMENT_MANAGER'
  | 'DEPARTMENT_LEADER'
  | 'VICE_PRESIDENT'
  | 'PRESIDENT'

export interface User {
  id: number
  username: string
  name: string
  role: Role
  departmentId: number
  departmentName: string
  isActive: boolean
  email?: string
  phone?: string
}

export interface LoginResult {
  success: boolean
  error?: string
  user?: User
}
