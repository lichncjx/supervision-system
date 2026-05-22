import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok } from '@/shared/http/api-response'
import { getDashboardDataUseCase } from '@/features/dashboard/application/get-dashboard-data.usecase'
import type { DashboardData } from '@/features/dashboard/domain/dashboard.types'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const limit = Number(searchParams.get('limit') || undefined)

  const response: DashboardData = await getDashboardDataUseCase({
    currentUser,
    options: { limit },
  })

  return ok(response)
})
