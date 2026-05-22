import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { getCompletionRateUseCase } from '@/features/dashboard/application/get-completion-rate.usecase'
import type { DashboardCompletionRateResponse } from '@/features/dashboard/contract/dashboard-api.types'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const result = await getCompletionRateUseCase({
    currentUser,
    type,
    startDate,
    endDate,
  })

  if (result.kind === 'error') return fromError(result)

  const response: DashboardCompletionRateResponse = {
    items: result.items,
    total: result.total,
  }

  return ok(response)
})
