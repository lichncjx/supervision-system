import type {
  UserApiDto,
  UserListItemApiDto,
  UserRoleApiDto,
} from '@/features/users/contract/user-api.types'
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
}): UserListItemApiDto {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as UserRoleApiDto,
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
}): UserApiDto {
  return {
    id: user.id,
    name: user.name,
    role: user.role as UserRoleApiDto,
    departmentId: user.departmentId,
    departmentName: user.department?.name || '',
  }
}
