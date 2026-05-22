import { NextRequest } from 'next/server'
import { prisma } from '@/shared/db/prisma'
import { verifyToken } from '@/shared/auth/jwt'
import { AppError } from '@/shared/errors/app-error'
import { ErrorCode } from '@/shared/errors/error-codes'
import type { AuthUser } from '@/shared/auth/auth.types'

export interface BaseCurrentUser {
  id: number
  role: string
  departmentId: number
}

export interface CurrentUser extends BaseCurrentUser {
  name: string
}

export async function getCurrentUser(
  request: NextRequest,
): Promise<AuthUser | null> {
  const token = request.cookies.get('token')?.value
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { department: true },
  })

  if (!user || !user.isActive) return null

  return user
}

export async function requireCurrentUser(request: NextRequest) {
  const user = await getCurrentUser(request)

  if (!user) {
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      '未登录或登录已过期',
      401,
    )
  }

  return user
}
