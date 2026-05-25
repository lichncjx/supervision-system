import { Role } from '@prisma/client'
import { isAdmin } from '@/features/users/domain/role.rules'
import {
  findUserById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { toUserListItemDto } from './user.dto'
import type { UserListItemDto } from '@/features/users/application/user.dto'
import { type Result, err, ok } from '@/shared/result'

export interface UpdateUserInput {
  name?: string
  role?: string
  departmentId?: number
  email?: string | null
  phone?: string | null
  isActive?: boolean
}

export async function updateUserUseCase(
  currentUser: { id: number; role: string },
  userId: number,
  input: UpdateUserInput,
): Promise<Result<UserListItemDto>> {
  if (!isAdmin(currentUser.role)) {
    return err(403, '权限不足')
  }

  if (isNaN(userId)) {
    return err(400, '无效的用户ID')
  }

  const user = await findUserById(userId)
  if (!user) {
    return err(404, '用户不存在')
  }

  const { name, role, departmentId, email, phone, isActive } = input
  const updateData: Record<string, unknown> = {}

  if (name !== undefined) updateData.name = name
  if (role !== undefined) {
    const validRoles = Object.values(Role)
    if (!validRoles.includes(role as Role)) {
      return err(400, '无效的角色')
    }
    updateData.role = role
  }
  if (departmentId !== undefined) {
    const department = await findDepartmentById(departmentId)
    if (!department) {
      return err(400, '部门不存在')
    }
    updateData.departmentId = departmentId
  }
  if (email !== undefined) updateData.email = email
  if (phone !== undefined) updateData.phone = phone
  if (isActive !== undefined) updateData.isActive = isActive

  const updatedUser = await updateUser(userId, updateData)
  return ok(toUserListItemDto(updatedUser))
}
