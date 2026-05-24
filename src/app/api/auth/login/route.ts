import { NextRequest } from 'next/server'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { loginUseCase, type LoginInput } from '@/features/users/application/login.usecase'

export const POST = withApiHandler(async (request: NextRequest) => {
  const body = (await request.json()) as LoginInput

  const result = await loginUseCase(body)
  if (!result.ok) return fromError(result)

  const isHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    process.env.NODE_ENV !== 'production'

  const response = ok(result.data.user)
  response.cookies.set({
    name: 'token',
    value: result.data.token,
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60,
    path: '/',
  })

  return response
})
