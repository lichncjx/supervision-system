import type { CurrentUserDto, RoleDto } from "../application/user.dto"

export interface CreateUserRequest {
  username: string
  password: string
  name: string
  role: RoleDto
  departmentId: number
  email?: string | null
  phone?: string | null
}

export interface UpdateUserRequest {
  name?: string
  role?: RoleDto
  departmentId?: number
  email?: string | null
  phone?: string | null
  isActive?: boolean
}

export interface ToggleUserStatusRequest {
  isActive?: boolean
}

// export interface ToggleUserStatusResponse {
//   id: number
//   username: string
//   isActive: boolean
// }

export interface ResetUserPasswordRequest {
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: true
  user: CurrentUserDto
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

