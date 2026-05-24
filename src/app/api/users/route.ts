import { NextRequest } from 'next/server'
import { Role } from '@prisma/client'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { listUsersUseCase } from '@/features/users/application/list-users.usecase'
import { createUserUseCase } from '@/features/users/application/create-user.usecase'
import type { CreateUserInput } from '@/features/users/application/create-user.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  if (currentUser.role !== Role.ADMIN) return fail('权限不足', 403)

  const result = await listUsersUseCase(currentUser)
  if (!result.ok) return fromError(result)

  return ok(result.data)
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  if (currentUser.role !== Role.ADMIN) return fail('权限不足', 403)

  const body = (await request.json()) as CreateUserInput
  const result = await createUserUseCase(currentUser, body)
  if (!result.ok) return fromError(result)

  return ok(result.data, { status: 201 })
})
