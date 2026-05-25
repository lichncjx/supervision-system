import { isAdmin } from '@/features/users/domain/role.rules'
import {
  findUserWithPasswordById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'
import { hashPassword } from '@/shared/auth/password'
import { type Result, err, ok } from '@/shared/result'

export interface ResetPasswordInput {
  password: string
}

export async function resetUserPasswordUseCase(
  currentUser: { id: number; role: string },
  userId: number,
  input: ResetPasswordInput,
): Promise<Result> {
  if (!isAdmin(currentUser.role)) {
    return err(403, '权限不足')
  }

  if (isNaN(userId)) {
    return err(400, '无效的用户ID')
  }

  const user = await findUserWithPasswordById(userId)
  if (!user) {
    return err(404, '用户不存在')
  }

  const { password } = input
  if (!password || password.length < 6) {
    return err(400, '密码长度不能少于6位')
  }

  const passwordHash = await hashPassword(password)
  await updateUser(userId, { passwordHash })
  return ok()
}
