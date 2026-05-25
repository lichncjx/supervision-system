import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { ok, fromError } from '@/shared/http/api-response'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { changePasswordUseCase, type ChangePasswordInput } from '@/features/users/application/change-password.usecase'

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const body = (await request.json()) as ChangePasswordInput

  const result = await changePasswordUseCase(currentUser.id, body)
  if (!result.ok)
    return fromError(result)

  return ok()
})
