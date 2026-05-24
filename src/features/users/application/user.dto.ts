import { PROTECTED_USERNAMES } from "../domain/protected-usernames"

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
}export function toUserDto(user: {
    id: number
    name: string
    role: string
    departmentId: number | null
    department: { name: string } | null
}): UserDto {
    return {
        id: user.id,
        name: user.name,
        role: user.role as RoleDto,
        departmentId: user.departmentId,
        departmentName: user.department?.name || '',
    }
}
export function toUserListItemDto(user: {
    id: number
    username: string
    name: string
    role: string
    departmentId: number | null
    department: { name: string } | null
    isActive: boolean
    email: string | null
    phone: string | null
    createdAt: Date
}): UserListItemDto {
    return {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role as RoleDto,
        departmentId: user.departmentId,
        departmentName: user.department?.name || '',
        isActive: user.isActive,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        isProtected: PROTECTED_USERNAMES.includes(user.username),
    }
}

