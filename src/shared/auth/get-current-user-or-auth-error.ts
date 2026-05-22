import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/auth/get-current-user'
import { fail } from '@/shared/http/api-response'
import type { CurrentUser } from './current-user'

type AuthResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; response: NextResponse }

export async function getCurrentUserOrAuthError(
  request: NextRequest,
): Promise<AuthResult> {
  const user = await getCurrentUser(request)

  if (!user) {
    return {
      ok: false,
      response: fail('未登录或登录已过期', 401),
    }
  }

  return { ok: true, user }
}
