import { isAdmin } from '@/features/users/domain/role.rules'
import { findAllUsers } from '@/features/users/infrastructure/user.repository'
import { toUserListItemDto } from './user.dto'
import type { UserListItemDto } from '@/features/users/application/user.dto'
import { type Result, err, ok } from '@/shared/result'

export async function listUsersUseCase(currentUser: {
  id: number
  role: string
}): Promise<Result<UserListItemDto[]>> {
  if (!isAdmin(currentUser.role)) {
    return err(403, '权限不足')
  }

  const users = await findAllUsers()
  return ok(users.map(toUserListItemDto))
}
