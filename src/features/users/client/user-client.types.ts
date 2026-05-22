import type { UserRoleApiDto } from '@/features/users/contract/user-api.types'

export type { UserRoleApiDto as Role } from '@/features/users/contract/user-api.types'

export interface User {
  id: number
  username?: string
  name: string
  role: UserRoleApiDto
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
