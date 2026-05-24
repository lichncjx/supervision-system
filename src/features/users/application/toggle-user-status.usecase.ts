import { isAdmin } from '@/features/users/domain/role.rules'
import { PROTECTED_USERNAMES } from '@/features/users/domain/protected-usernames'
import {
  findUserById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'
import { type Result, err, ok } from '@/shared/result'

export async function toggleUserStatusUseCase(
  currentUser: { id: number; role: string },
  userId: number,
): Promise<Result<boolean>> {
  if (!isAdmin(currentUser.role)) {
    return err(403, '权限不足')
  }

  if (isNaN(userId)) {
    return err(400, '无效的用户ID')
  }

  if (userId === currentUser.id) {
    return err(403, '不允许停用当前登录的管理员账号')
  }

  const user = await findUserById(userId)
  if (!user) {
    return err(404, '用户不存在')
  }

  if (PROTECTED_USERNAMES.includes(user.username)) {
    return err(403, '内置账号不允许停用')
  }

  const newIsActive = !user.isActive
  await updateUser(userId, { isActive: newIsActive })
  return ok(newIsActive)
}
