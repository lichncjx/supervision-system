import { isAdmin } from '@/features/users/domain/role.rules'
import { findAllUsers } from '@/features/users/infrastructure/user.repository'
import { toUserListItem } from '@/features/users/application/user-api.mapper'
import type { UserListItem } from '@/features/users/application/user-api.types'

export type ListUsersResult =
  | { kind: 'ok'; data: UserListItem[] }
  | { kind: 'error'; status: number; message: string }

export async function listUsersUseCase(currentUser: {
  id: number
  role: string
}): Promise<ListUsersResult> {
  if (!isAdmin(currentUser.role)) {
    return { kind: 'error', status: 403, message: '权限不足' }
  }

  const users = await findAllUsers()
  return { kind: 'ok', data: users.map(toUserListItem) }
}
