import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fromError, ok } from '@/shared/http/api-response'
import {
  getSystemSettingsUseCase,
  updateSystemSettingsUseCase,
  type UpdateSystemSettingsInput,
} from '@/features/system-settings/application/system-settings.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireCurrentUser(request)
  return ok(await getSystemSettingsUseCase(), { headers: { 'Cache-Control': 'no-store' } })
})

export const PUT = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const result = await updateSystemSettingsUseCase(currentUser, await request.json() as UpdateSystemSettingsInput)
  if (!result.ok) return fromError(result)
  return ok(result.data, { headers: { 'Cache-Control': 'no-store' } })
})
