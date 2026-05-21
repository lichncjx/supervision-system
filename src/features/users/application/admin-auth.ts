import { Role } from '@prisma/client'
import { verifyToken } from '@/shared/auth/jwt'
import { findUserBasicAuthById } from '@/features/users/infrastructure/user.repository'

export type AdminAuthResult =
  | { ok: true; user: { id: number; role: string; departmentId: number; name: string } }
  | { ok: false; status: number; message: string }

export async function authenticateAdmin(
  token: string | undefined,
): Promise<AdminAuthResult> {
  if (!token) {
    return { ok: false, status: 401, message: '未登录' }
  }

  const decoded = verifyToken(token)
  if (!decoded) {
    return { ok: false, status: 401, message: '登录已过期' }
  }

  const user = await findUserBasicAuthById(decoded.userId)
  if (!user || user.role !== Role.ADMIN) {
    return { ok: false, status: 403, message: '权限不足' }
  }

  return { ok: true, user }
}
