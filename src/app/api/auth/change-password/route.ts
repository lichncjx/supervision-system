import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { success, fromError } from '@/shared/http/api-response'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { changePasswordUseCase } from '@/features/users/application/change-password.usecase'
import type { ChangePasswordRequest } from '@/features/users/contract/user-api.types'

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const body = (await request.json()) as ChangePasswordRequest

  const result = await changePasswordUseCase(currentUser.id, body)
  if (result.kind === 'error')
    return fromError(result)

  return success()
})
