import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok } from '@/shared/http/api-response'
import { findAllDepartments } from '@/features/departments/infrastructure/department.repository'

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireCurrentUser(request)

  const departments = await findAllDepartments()

  return ok(departments)
})
