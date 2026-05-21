import { isAdmin } from '@/features/users/domain/role.rules'
import {
  findUserById,
  deleteUser,
} from '@/features/users/infrastructure/user.repository'

const PROTECTED_USERNAMES = [
  'admin',
  'supervisor',
  'president',
  'vice_president',
  'dept_leader',
  'dept_manager',
]

export type DeleteUserResult =
  | { kind: 'ok' }
  | { kind: 'error'; status: number; message: string }

export async function deleteUserUseCase(
  currentUser: { id: number; role: string },
  userId: number,
): Promise<DeleteUserResult> {
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

  if (PROTECTED_USERNAMES.includes(user.username)) {
    return { kind: 'error', status: 403, message: '内置账号不允许删除' }
  }

  await deleteUser(userId)
  return { kind: 'ok' }
}
