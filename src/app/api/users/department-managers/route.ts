import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { listDepartmentManagersUseCase } from '@/features/users/application/list-department-users.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const departmentId = searchParams.get('departmentId')
  if (!departmentId) {
    return fail('请提供部门ID', 400)
  }

  const targetDeptId = parseInt(departmentId)
  const result = await listDepartmentManagersUseCase(currentUser, targetDeptId)
  if (!result.ok) return fromError(result)

  return ok(result.data)
})
