import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fromError, ok } from '@/shared/http/api-response'
import {
  createWorkDraftsBatchUseCase,
  type CreateWorkDraftsBatchInput,
} from '@/features/works/application/create-work-drafts-batch.usecase'

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const body = await request.json() as Omit<CreateWorkDraftsBatchInput, 'currentUser'>
  const result = await createWorkDraftsBatchUseCase({ ...body, currentUser })
  if (!result.ok) return fromError(result)
  return ok(result.data)
})
