export type UserRoleApiDto =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'DEPARTMENT_MANAGER'
  | 'DEPARTMENT_LEADER'
  | 'VICE_PRESIDENT'
  | 'PRESIDENT'

export interface UserApiDto {
  id: number
  name: string
  role: UserRoleApiDto
  departmentId: number | null
  departmentName: string
}

export interface CurrentUserApiDto extends UserApiDto {
  username: string
  isActive: boolean
}

export interface UserListItemApiDto extends CurrentUserApiDto {
  email: string | null
  phone: string | null
  createdAt: string
  isProtected: boolean
}

export type CompanyLeadersResponse = UserApiDto[]
export type DepartmentUsersResponse = UserApiDto[]
export type UserListResponse = UserListItemApiDto[]

export interface CreateUserRequest {
  username: string
  password: string
  name: string
  role: UserRoleApiDto
  departmentId: number
  email?: string | null
  phone?: string | null
}

export interface UpdateUserRequest {
  name?: string
  role?: UserRoleApiDto
  departmentId?: number
  email?: string | null
  phone?: string | null
  isActive?: boolean
}

export interface ToggleUserStatusRequest {
  isActive?: boolean
}

export interface ToggleUserStatusResponse {
  id: number
  username: string
  isActive: boolean
}

export interface ResetUserPasswordRequest {
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: true
  user: CurrentUserApiDto
}

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

