import { NextRequest } from 'next/server'
import { prisma } from '@/shared/db/prisma'
import { verifyToken } from '@/shared/auth/jwt'
import { AppError } from '@/shared/errors/app-error'
import { ErrorCode } from '@/shared/errors/error-codes'

export interface BaseCurrentUser {
  id: number
  role: string
  departmentId: number
}

export interface CurrentUser extends BaseCurrentUser {
  username: string
  name: string
  departmentName: string
  isActive: boolean
}

export async function getCurrentUser(
  request: NextRequest,
): Promise<CurrentUser | null> {
  const token = request.cookies.get('token')?.value
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { department: true },
  })

  if (!user || !user.isActive) return null

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: user.department?.name || '',
    isActive: user.isActive,
  }
}

export async function requireCurrentUser(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user)
    throw new AppError(ErrorCode.UNAUTHORIZED, '登录或登录已过期', 401,)

  return user
}
