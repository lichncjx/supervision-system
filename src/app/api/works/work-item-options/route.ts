import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fromError, ok } from '@/shared/http/api-response'
import { listWorkItemOptionsUseCase } from '@/features/works/application/list-work-item-options.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const { searchParams } = new URL(request.url)
  const result = await listWorkItemOptionsUseCase({
    currentUser,
    type: searchParams.get('type'),
    assessmentYear: searchParams.get('assessmentYear'),
    departmentId: searchParams.get('departmentId'),
    keyword: searchParams.get('keyword'),
  })
  if (!result.ok) return fromError(result)
  return ok(result.data)
})
