import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok } from '@/shared/http/api-response'
import { getDashboardSummaryUseCase } from '@/features/dashboard/application/get-dashboard-summary.usecase'
import type { DashboardSummary } from '@/features/dashboard/domain/dashboard.types'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const response: DashboardSummary = await getDashboardSummaryUseCase({
    currentUser,
  })

  return ok(response)
})
