import { NextRequest } from 'next/server'
import { Role } from '@prisma/client'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { updateUserUseCase } from '@/features/users/application/update-user.usecase'
import { deleteUserUseCase } from '@/features/users/application/delete-user.usecase'
import type { UpdateUserInput } from '@/features/users/application/update-user.usecase'

export const PUT = withApiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const currentUser = await requireCurrentUser(request)
  if (currentUser.role !== Role.ADMIN) return fail('权限不足', 403)

  const { id } = await params
  const userId = parseInt(id)
  if (isNaN(userId)) return fail('无效的用户ID', 400)

  const body = (await request.json()) as UpdateUserInput
  const result = await updateUserUseCase(currentUser, userId, body)
  if (!result.ok) return fromError(result)

  return ok(result.data)
})

export const DELETE = withApiHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const currentUser = await requireCurrentUser(request)
  if (currentUser.role !== Role.ADMIN) return fail('权限不足', 403)

  const { id } = await params
  const userId = parseInt(id)

  const result = await deleteUserUseCase(currentUser, userId)
  if (!result.ok) return fromError(result)

  return ok()
})
