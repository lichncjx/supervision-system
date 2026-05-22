import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { listCompanyLeadersUseCase } from '@/features/users/application/list-company-leaders.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireCurrentUser(request)

  const result = await listCompanyLeadersUseCase()
  if (result.kind === 'error') return fromError(result)

  return ok(result.data)
})
