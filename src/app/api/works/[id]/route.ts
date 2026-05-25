import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { getWorkDetailUseCase } from '@/features/works/application/get-work-detail.usecase'
import { updateWorkUseCase, type UpdateWorkBody } from '@/features/works/application/update-work.usecase'
import { deleteWorkUseCase } from '@/features/works/application/delete-work.usecase'

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireCurrentUser(request)

    const { id } = await params
    const workId = parseInt(id)
    if (isNaN(workId)) {
      return fail('无效的事项ID', 400)
    }

    const result = await getWorkDetailUseCase({ currentUser, workId })

    if (result.kind === 'not-found') {
      return fail('事项不存在', 404)
    }

    if (result.kind === 'forbidden') {
      return fail('无权限访问此事项', 403)
    }

    return ok(result.data)
  },
)

export const PUT = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireCurrentUser(request)

    const { id } = await params
    const workId = parseInt(id)
    if (isNaN(workId)) {
      return fail('无效的事项ID', 400)
    }

    const body = (await request.json()) as UpdateWorkBody
    const result = await updateWorkUseCase({ currentUser, workId, body })
    if (!result.ok) return fromError(result)

    return ok(result.data)
  },
)

export const DELETE = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireCurrentUser(request)

    const { id } = await params
    const workId = parseInt(id)
    if (isNaN(workId)) {
      return fail('无效的事项ID', 400)
    }

    const result = await deleteWorkUseCase({ currentUser, workId })
    if (!result.ok) return fromError(result)

    return ok()
  },
)
