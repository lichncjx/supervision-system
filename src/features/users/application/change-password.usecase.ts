import {
  findUserWithPasswordById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'
import { verifyPassword, hashPassword } from '@/shared/auth/password'
import { type Result, err, ok } from '@/shared/result'

export interface ChangePasswordBody {
  oldPassword: string
  newPassword: string
}

export async function changePasswordUseCase(
  userId: number,
  body: ChangePasswordBody,
): Promise<Result> {
  const { oldPassword, newPassword } = body

  if (!oldPassword || !newPassword) {
    return err(400, '旧密码和新密码不能为空')
  }

  if (newPassword.length < 6) {
    return err(400, '新密码长度不能少于6位')
  }

  const user = await findUserWithPasswordById(userId)
  if (!user) {
    return err(404, '用户不存在')
  }

  const isOldPasswordValid = await verifyPassword(oldPassword, user.passwordHash)
  if (!isOldPasswordValid) {
    return err(400, '旧密码不正确')
  }

  const passwordHash = await hashPassword(newPassword)
  await updateUser(userId, { passwordHash })
  return ok()
}
