import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { queryWorksUseCase } from '@/features/works/application/query-works.usecase'
import { createWorkUseCase, type CreateWorkBody } from '@/features/works/application/create-work.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const params = {
    type: searchParams.get('type'),
    status: searchParams.get('status'),
    departmentId: searchParams.get('departmentId'),
    keyword: searchParams.get('keyword'),
    assessmentYear: searchParams.get('assessmentYear'),
    workItem: searchParams.get('workItem'),
  }

  const result = await queryWorksUseCase({ currentUser, params })
  if (!result.ok) return fromError(result)

  return ok(result.data)
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const body = (await request.json()) as CreateWorkBody
  const result = await createWorkUseCase({ currentUser, body })
  if (!result.ok) return fromError(result)

  return ok(result.data)
})
