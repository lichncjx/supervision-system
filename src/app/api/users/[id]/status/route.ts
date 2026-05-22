import { NextRequest } from 'next/server'
import { Role } from '@prisma/client'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { toggleUserStatusUseCase } from '@/features/users/application/toggle-user-status.usecase'
import type { ToggleUserStatusRequest } from '@/features/users/contract/user-api.types'

export const PUT = withApiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const currentUser = await requireCurrentUser(request)
  if (currentUser.role !== Role.ADMIN) return fail('权限不足', 403)

  const { id } = await params
  const userId = parseInt(id)
  if (isNaN(userId)) return fail('无效的用户ID', 400)

  const body = (await request.json()) as ToggleUserStatusRequest
  const result = await toggleUserStatusUseCase(currentUser, userId, body)
  if (result.kind === 'error') return fromError(result)

  return ok(result.data)
})
