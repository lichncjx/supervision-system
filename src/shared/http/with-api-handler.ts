import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/shared/errors/app-error'

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
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        )
      }

      console.error('Unhandled API error:', error)
      return NextResponse.json(
        { error: '服务器内部错误', code: 'INTERNAL_ERROR' },
        { status: 500 },
      )
    }
  }
}
