import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { getCompletionRateUseCase } from '@/features/dashboard/application/get-completion-rate.usecase'

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

  if (!result.ok) return fromError(result)

  return ok(result.data)
})
