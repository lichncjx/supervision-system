import { NextRequest } from 'next/server'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { loginUseCase } from '@/features/users/application/login.usecase'
import type { LoginRequest } from '@/features/users/contract/user-api.types'

export const POST = withApiHandler(async (request: NextRequest) => {
  const { username, password } = (await request.json()) as LoginRequest

  const result = await loginUseCase(username, password)
  if (!result.ok) return fromError(result)

  const isHttps =
    request.headers.get('x-forwarded-proto') === 'https' ||
    process.env.NODE_ENV !== 'production'

  const response = ok({ success: true, user: result.data.user })
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
