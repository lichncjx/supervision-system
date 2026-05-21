import { isAdmin } from '@/features/users/domain/role.rules'
import { PROTECTED_USERNAMES } from '@/features/users/domain/protected-usernames'
import {
  findUserById,
  updateUser,
} from '@/features/users/infrastructure/user.repository'

export interface ToggleUserStatusBody {
  isActive?: boolean
}

export type ToggleUserStatusResult =
  | { kind: 'ok'; data: { id: number; username: string; isActive: boolean } }
  | { kind: 'error'; status: number; message: string }

export async function toggleUserStatusUseCase(
  currentUser: { id: number; role: string },
  userId: number,
  body: ToggleUserStatusBody,
): Promise<ToggleUserStatusResult> {
  if (!isAdmin(currentUser.role)) {
    return { kind: 'error', status: 403, message: '权限不足' }
  }

  if (isNaN(userId)) {
    return { kind: 'error', status: 400, message: '无效的用户ID' }
  }

  if (userId === currentUser.id) {
    return {
      kind: 'error',
      status: 403,
      message: '不允许停用当前登录的管理员账号',
    }
  }

  const user = await findUserById(userId)
  if (!user) {
    return { kind: 'error', status: 404, message: '用户不存在' }
  }

  if (PROTECTED_USERNAMES.includes(user.username)) {
    return { kind: 'error', status: 403, message: '内置账号不允许停用' }
  }

  const { isActive } = body
  if (isActive === undefined) {
    return { kind: 'error', status: 400, message: '请指定启用状态' }
  }

  const updatedUser = await updateUser(userId, { isActive })
  return {
    kind: 'ok',
    data: {
      id: updatedUser.id,
      username: updatedUser.username,
      isActive: updatedUser.isActive,
    },
  }
}
