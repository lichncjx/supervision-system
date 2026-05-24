export type RoleDto = 'ADMIN' |
    'SUPERVISOR' |
    'DEPARTMENT_MANAGER' |
    'DEPARTMENT_LEADER' |
    'VICE_PRESIDENT' |
    'PRESIDENT'

export interface UserDto {
    id: number
    name: string
    role: RoleDto
    departmentId: number | null
    departmentName: string
}

export interface CurrentUserDto extends UserDto {
    username: string
    isActive: boolean
}

export interface UserListItemDto extends CurrentUserDto {
    email: string | null
    phone: string | null
    createdAt: string
    isProtected: boolean
}
