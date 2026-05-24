import { Role } from '@prisma/client'
import { isAdmin } from '@/features/users/domain/role.rules'
import { PROTECTED_USERNAMES } from '@/features/users/domain/protected-usernames'
import {
  findUserByUsername,
  createUser,
} from '@/features/users/infrastructure/user.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { hashPassword } from '@/shared/auth/password'
import { toUserListItemDto } from './user.dto'
import type { UserListItemDto } from '@/features/users/application/user.dto'
import { type Result, err, ok } from '@/shared/result'

export interface CreateUserInput {
  username: string
  password: string
  name: string
  role: string
  departmentId: number
  email?: string | null
  phone?: string | null
}

export async function createUserUseCase(
  currentUser: { id: number; role: string },
  input: CreateUserInput,
): Promise<Result<UserListItemDto>> {
  if (!isAdmin(currentUser.role)) {
    return err(403, '权限不足')
  }

  const { username, password, name, role, departmentId, email, phone } = input

  if (!username || !password || !name || !role || !departmentId) {
    return err(400, '必填字段不能为空')
  }

  if (PROTECTED_USERNAMES.includes(username)) {
    return err(400, '用户名已存在')
  }

  const existingUser = await findUserByUsername(username)
  if (existingUser) {
    return err(400, '用户名已存在')
  }

  const department = await findDepartmentById(departmentId)
  if (!department) {
    return err(400, '部门不存在')
  }

  const validRoles = Object.values(Role)
  if (!validRoles.includes(role as Role)) {
    return err(400, '无效的角色')
  }

  const passwordHash = await hashPassword(password)

  const newUser = await createUser({
    username,
    passwordHash,
    name,
    role: role as Role,
    departmentId,
    email: email ?? null,
    phone: phone ?? null,
  })

  return ok(toUserListItemDto(newUser))
}
