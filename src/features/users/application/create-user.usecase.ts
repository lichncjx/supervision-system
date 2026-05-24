import { Role } from '@prisma/client'
import { isAdmin } from '@/features/users/domain/role.rules'
import { PROTECTED_USERNAMES } from '@/features/users/domain/protected-usernames'
import {
  findUserByUsername,
  createUser,
} from '@/features/users/infrastructure/user.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { hashPassword } from '@/shared/auth/password'
import { toUserListItem } from '@/features/users/application/user-api.mapper'
import type { UserListItemDto } from '@/features/users/application/user.dto'

export interface CreateUserBody {
  username: string
  password: string
  name: string
  role: string
  departmentId: number
  email?: string | null
  phone?: string | null
}

export type CreateUserResult =
  | { kind: 'ok'; data: UserListItemDto }
  | { kind: 'error'; status: number; message: string }

export async function createUserUseCase(
  currentUser: { id: number; role: string },
  body: CreateUserBody,
): Promise<CreateUserResult> {
  if (!isAdmin(currentUser.role)) {
    return { kind: 'error', status: 403, message: '权限不足' }
  }

  const { username, password, name, role, departmentId, email, phone } = body

  if (!username || !password || !name || !role || !departmentId) {
    return { kind: 'error', status: 400, message: '必填字段不能为空' }
  }

  if (PROTECTED_USERNAMES.includes(username)) {
    return { kind: 'error', status: 400, message: '用户名已存在' }
  }

  const existingUser = await findUserByUsername(username)
  if (existingUser) {
    return { kind: 'error', status: 400, message: '用户名已存在' }
  }

  const department = await findDepartmentById(departmentId)
  if (!department) {
    return { kind: 'error', status: 400, message: '部门不存在' }
  }

  const validRoles = Object.values(Role)
  if (!validRoles.includes(role as Role)) {
    return { kind: 'error', status: 400, message: '无效的角色' }
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

  return { kind: 'ok', data: toUserListItem(newUser) }
}
