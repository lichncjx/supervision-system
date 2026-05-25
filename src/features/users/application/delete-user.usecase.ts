import { isAdmin } from '@/features/users/domain/role.rules'
import { PROTECTED_USERNAMES } from '@/features/users/domain/protected-usernames'
import { findUserById, deleteUser } from '@/features/users/infrastructure/user.repository'
import { type Result, err, ok } from '@/shared/result'

export async function deleteUserUseCase(
  currentUser: { id: number; role: string },
  userId: number,
): Promise<Result> {
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

  if (PROTECTED_USERNAMES.includes(user.username)) {
    return err(403, '内置账号不允许删除')
  }

  await deleteUser(userId)
  return ok()
}
