import type { RoleDto } from "../application/user.dto"

export type { RoleDto as Role } from '@/features/users/application/user.dto'

export interface User {
  id: number
  username?: string
  name: string
  role: RoleDto
  departmentId: number | null
  departmentName: string
  isActive?: boolean
  email?: string
  phone?: string
}

export interface LoginResult {
  success: boolean
  error?: string
  user?: User
}
