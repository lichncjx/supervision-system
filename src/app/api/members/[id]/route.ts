import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fail, fromError } from '@/shared/http/api-response'
import { Role } from '@prisma/client'
import { updateMemberUseCase } from '@/features/members/application/update-member.usecase'
import type { UpdateMemberRequest } from '@/features/members/contract/member-api.types'

type MemberParams = { params: Promise<{ id: string }> }

export const PATCH = withApiHandler(
  async (request: NextRequest, ...args: unknown[]) => {
    const currentUser = await requireCurrentUser(request)

    if (currentUser.role !== Role.ADMIN) {
      return fail('权限不足', 403)
    }

    const { id } = await (args[0] as MemberParams).params
    const memberId = parseInt(id)
    if (isNaN(memberId)) {
      return fail('无效的人员ID', 400)
    }

    const body = (await request.json()) as UpdateMemberRequest
    const result = await updateMemberUseCase({
      memberId,
      name: body.name,
      departmentId: body.departmentId,
      phone: body.phone,
      isLeader: body.isLeader,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      userId: body.userId,
    })

    if (result.kind === 'error') return fromError(result)

    return NextResponse.json({ ...result.data, warnings: result.warnings })
  },
)
