import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/shared/errors/app-error'
import { fail } from '@/shared/http/api-response'

type Handler = (
  request: NextRequest,
  ...args: unknown[]
) => Promise<NextResponse> | NextResponse

export function withApiHandler(handler: Handler) {
  return async (
    request: NextRequest,
    ...args: unknown[]
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
