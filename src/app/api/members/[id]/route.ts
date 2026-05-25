import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { Role } from '@prisma/client'
import { updateMemberUseCase } from '@/features/members/application/update-member.usecase'

export const PATCH = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const currentUser = await requireCurrentUser(request)

    if (currentUser.role !== Role.ADMIN) {
      return fail('权限不足', 403)
    }

    const { id } = await params
    const memberId = parseInt(id)
    if (isNaN(memberId)) {
      return fail('无效的人员ID', 400)
    }

    const body = await request.json()
    const result = await updateMemberUseCase({ ...body, memberId })

    if (!result.ok) return fromError(result)

    return ok(result.data)
  },
)
