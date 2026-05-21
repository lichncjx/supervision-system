import { Role } from '@prisma/client'
import { isAdmin } from '@/features/users/domain/role.rules'
import {
  findUserById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'
import { findDepartmentById } from '@/features/users/infrastructure/department.repository'
import { toUserListItem } from '@/features/users/application/user-api.mapper'
import type { UserListItem } from '@/features/users/application/user-api.types'

export interface UpdateUserBody {
  name?: string
  role?: string
  departmentId?: number
  email?: string | null
  phone?: string | null
  isActive?: boolean
}

export type UpdateUserResult =
  | { kind: 'ok'; data: UserListItem }
  | { kind: 'error'; status: number; message: string }

export async function updateUserUseCase(
  currentUser: { id: number; role: string },
  userId: number,
  body: UpdateUserBody,
): Promise<UpdateUserResult> {
  if (!isAdmin(currentUser.role)) {
    return { kind: 'error', status: 403, message: '权限不足' }
  }

  if (isNaN(userId)) {
    return { kind: 'error', status: 400, message: '无效的用户ID' }
  }

  const user = await findUserById(userId)
  if (!user) {
    return { kind: 'error', status: 404, message: '用户不存在' }
  }

  const { name, role, departmentId, email, phone, isActive } = body
  const updateData: Record<string, unknown> = {}

  if (name !== undefined) updateData.name = name
  if (role !== undefined) {
    const validRoles = Object.values(Role)
    if (!validRoles.includes(role as Role)) {
      return { kind: 'error', status: 400, message: '无效的角色' }
    }
    updateData.role = role
  }
  if (departmentId !== undefined) {
    const department = await findDepartmentById(departmentId)
    if (!department) {
      return { kind: 'error', status: 400, message: '部门不存在' }
    }
    updateData.departmentId = departmentId
  }
  if (email !== undefined) updateData.email = email
  if (phone !== undefined) updateData.phone = phone
  if (isActive !== undefined) updateData.isActive = isActive

  const updatedUser = await updateUser(userId, updateData)
  return { kind: 'ok', data: toUserListItem(updatedUser) }
}
