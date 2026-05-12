import { NextResponse, NextRequest } from 'next/server'
import { verifyToken } from '@/shared/auth/jwt'
import { findUserById } from '@/shared/auth/get-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail } from '@/shared/http/api-response'

function clearTokenCookie(request: NextRequest, response: NextResponse) {
  const isHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    process.env.NODE_ENV !== 'production'

  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const token = request.cookies.get('token')?.value

  if (!token) {
    return fail('未登录', 401)
  }

  const decoded = verifyToken(token)

  if (!decoded) {
    const response = fail('登录已过期', 401)
    clearTokenCookie(request, response)
    return response
  }

  const user = await findUserById(decoded.userId)

  if (!user) {
    const response = fail('用户不存在或已停用', 401)
    clearTokenCookie(request, response)
    return response
  }

  return ok({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: user.department?.name || '',
    isActive: user.isActive,
  })
})
