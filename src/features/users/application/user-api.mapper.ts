import type { UserListItemDto } from "./user.dto"
import type { UserDto } from "./user.dto"
import type { RoleDto } from "./user.dto"
import { PROTECTED_USERNAMES } from '@/features/users/domain/protected-usernames'

export function toUserListItem(user: {
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

export function toUserApiDto(user: {
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
