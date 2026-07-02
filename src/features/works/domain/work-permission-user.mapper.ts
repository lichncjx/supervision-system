import type { Role } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { PermissionUser } from './work.permissions'

export function toPermissionUser(user: BaseCurrentUser): PermissionUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role as Role,
    departmentId: user.departmentId,
  }
}
