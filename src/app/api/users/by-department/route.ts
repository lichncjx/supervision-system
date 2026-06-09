import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fromError } from '@/shared/http/api-response'
import { listDepartmentUsersUseCase } from '@/features/users/application/list-department-users.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const { searchParams } = new URL(request.url)
  const departmentId = Number(searchParams.get('departmentId'))

  const result = await listDepartmentUsersUseCase(currentUser, departmentId)
  if (!result.ok) return fromError(result)

  return ok(result.data)
})
