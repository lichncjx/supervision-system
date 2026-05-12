import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/shared/auth/get-current-user'
import { AppError } from '@/shared/errors/app-error'
import { ErrorCode } from '@/shared/errors/error-codes'

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
