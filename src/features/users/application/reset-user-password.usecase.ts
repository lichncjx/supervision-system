import { isAdmin } from '@/features/users/domain/role.rules'
import {
  findUserWithPasswordById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'
import { hashPassword } from '@/shared/auth/password'

export interface ResetPasswordBody {
  password: string
}

export type ResetPasswordResult =
  | { kind: 'ok' }
  | { kind: 'error'; status: number; message: string }

export async function resetUserPasswordUseCase(
  currentUser: { id: number; role: string },
  userId: number,
  body: ResetPasswordBody,
): Promise<ResetPasswordResult> {
  if (!isAdmin(currentUser.role)) {
    return { kind: 'error', status: 403, message: '权限不足' }
  }

  if (isNaN(userId)) {
    return { kind: 'error', status: 400, message: '无效的用户ID' }
  }

  const user = await findUserWithPasswordById(userId)
  if (!user) {
    return { kind: 'error', status: 404, message: '用户不存在' }
  }

  const { password } = body
  if (!password || password.length < 6) {
    return { kind: 'error', status: 400, message: '密码长度不能少于6位' }
  }

  const passwordHash = await hashPassword(password)
  await updateUser(userId, { passwordHash })
  return { kind: 'ok' }
}
