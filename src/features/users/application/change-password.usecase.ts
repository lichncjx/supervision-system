import {
  findUserWithPasswordById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'
import { verifyPassword, hashPassword } from '@/shared/auth/password'

export interface ChangePasswordBody {
  oldPassword: string
  newPassword: string
}

export type ChangePasswordResult =
  | { kind: 'ok' }
  | { kind: 'error'; status: number; message: string }

export async function changePasswordUseCase(
  userId: number,
  body: ChangePasswordBody,
): Promise<ChangePasswordResult> {
  const { oldPassword, newPassword } = body

  if (!oldPassword || !newPassword) {
    return { kind: 'error', status: 400, message: '旧密码和新密码不能为空' }
  }

  if (newPassword.length < 6) {
    return { kind: 'error', status: 400, message: '新密码长度不能少于6位' }
  }

  const user = await findUserWithPasswordById(userId)
  if (!user) {
    return { kind: 'error', status: 404, message: '用户不存在' }
  }

  const isOldPasswordValid = await verifyPassword(oldPassword, user.passwordHash)
  if (!isOldPasswordValid) {
    return { kind: 'error', status: 400, message: '旧密码不正确' }
  }

  const passwordHash = await hashPassword(newPassword)
  await updateUser(userId, { passwordHash })
  return { kind: 'ok' }
}
