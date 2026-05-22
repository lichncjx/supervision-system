import { NextRequest } from 'next/server'
import { prisma } from '@/shared/db/prisma'
import { verifyToken } from '@/shared/auth/jwt'
import type { AuthUser } from '@/shared/auth/auth.types'

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
