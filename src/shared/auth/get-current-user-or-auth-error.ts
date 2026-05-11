import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/db/prisma'
import { verifyToken } from '@/shared/auth/jwt'

type AuthResult =
  | { ok: true; user: { id: number; name: string; role: string; departmentId: number } }
  | { ok: false; response: NextResponse }

export async function getCurrentUserOrAuthError(
  request: NextRequest,
): Promise<AuthResult> {
  const token = request.cookies.get('token')?.value

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: '未登录' }, { status: 401 }),
    }
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    return {
      ok: false,
      response: NextResponse.json({ error: '登录已过期' }, { status: 401 }),
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  })

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: '用户不存在' }, { status: 401 }),
    }
  }

  return { ok: true, user }
}
