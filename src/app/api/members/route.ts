import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { queryMembersUseCase } from '@/features/members/application/query-members.usecase'
import { createMemberUseCase } from '@/features/members/application/create-member.usecase'
import { isAdmin } from '@/features/users/domain/role.rules'
import type {
  CreateMemberRequest,
  MemberOptionApiDto,
} from '@/features/members/contract/member-api.types'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const departmentIdRaw = searchParams.get('departmentId')
  const isLeaderRaw = searchParams.get('isLeader')
  const includeInactive = searchParams.get('includeInactive')

  let departmentId: number | undefined
  if (departmentIdRaw !== null) {
    departmentId = parseInt(departmentIdRaw)
    if (isNaN(departmentId)) {
      return fail('departmentId 必须为整数', 400)
    }
  }

  if (isLeaderRaw !== null && isLeaderRaw !== 'true' && isLeaderRaw !== 'false') {
    return fail('isLeader 只能为 true 或 false', 400)
  }

  const isAdminUser = isAdmin(currentUser.role)
  const result = await queryMembersUseCase({
    departmentId,
    isLeader: isLeaderRaw === 'true' ? true : isLeaderRaw === 'false' ? false : undefined,
    includeInactive: isAdminUser && includeInactive === 'true',
  })

  // Non-admin callers only receive fields needed for form dropdowns.
  const sanitized = isAdminUser
    ? result
    : result.map(({ id, name, departmentId, departmentName, isLeader }): MemberOptionApiDto => ({
      id, name, departmentId, departmentName, isLeader,
    }))

  return ok(sanitized)
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  if (!isAdmin(currentUser.role)) {
    return fail('权限不足', 403)
  }

  const body = (await request.json()) as CreateMemberRequest
  const result = await createMemberUseCase({
    name: body.name,
    departmentId: body.departmentId,
    phone: body.phone,
    isLeader: body.isLeader ?? false,
    sortOrder: body.sortOrder ?? 0,
    userId: body.userId,
    importFromUserId: body.importFromUserId,
  })

  if (!result.ok) return fromError(result)

  return ok(result.data, { status: 201 })
})
