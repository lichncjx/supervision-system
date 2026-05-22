import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import {
  listOperationLogsUseCase,
  parseOperationLogQuery,
} from '@/features/operation-logs/application/list-operation-logs.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const result = await listOperationLogsUseCase(
    currentUser,
    parseOperationLogQuery(searchParams),
  )

  if (result.kind === 'error') return fromError(result)

  return ok(result.data)
})
