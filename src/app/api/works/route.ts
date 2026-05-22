import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { queryWorksUseCase } from '@/features/works/application/query-works.usecase'
import { createWorkUseCase } from '@/features/works/application/create-work.usecase'
import type { CreateWorkRequest } from '@/features/works/contract/work-api.types'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const params = {
    type: searchParams.get('type'),
    status: searchParams.get('status'),
    departmentId: searchParams.get('departmentId'),
    keyword: searchParams.get('keyword'),
  }

  const result = await queryWorksUseCase({ currentUser, params })
  if (result.kind === 'error') return fromError(result)

  return ok(result.data)
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const body = (await request.json()) as CreateWorkRequest
  const result = await createWorkUseCase({ currentUser, body })
  if (result.kind === 'error') return fromError(result)

  return ok(result.data)
})
