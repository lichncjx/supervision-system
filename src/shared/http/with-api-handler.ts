import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/shared/errors/app-error'
import { fail } from '@/shared/http/api-response'

type Handler<Args extends unknown[] = []> = (
  request: NextRequest,
  ...args: Args
) => Promise<NextResponse> | NextResponse

export function withApiHandler<Args extends unknown[] = []>(
  handler: Handler<Args>,
) {
  return async (
    request: NextRequest,
    ...args: Args
  ): Promise<NextResponse> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      if (error instanceof AppError) {
        return fail(error.message, error.status, error.code)
      }

      console.error('Unhandled API error:', error)
      return fail('服务器内部错误', 500, 'INTERNAL_ERROR')
    }
  }
}
