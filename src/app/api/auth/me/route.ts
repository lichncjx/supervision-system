import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUser } from '@/shared/auth/get-current-user'
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
  const user = await getCurrentUser(request)

  if (!user) {
    const response = fail('未登录或登录已过期', 401)
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
