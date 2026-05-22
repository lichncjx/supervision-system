import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fromError } from '@/shared/http/api-response'
import { exportCompletionRateUseCase } from '@/features/excel/application/export-completion-rate.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const result = await exportCompletionRateUseCase({
    currentUser,
    startDate,
    endDate,
  })

  if (result.kind === 'error') return fromError(result)

  return new NextResponse(result.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    },
  })
})
