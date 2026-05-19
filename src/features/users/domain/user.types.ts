export type Role =
  | 'ADMIN'
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
