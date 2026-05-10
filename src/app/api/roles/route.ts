import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok } from '@/shared/http/api-response'
import { Role } from '@prisma/client'

const ROLE_NAMES: Record<Role, string> = {
  ADMIN: '系统管理员',
  SUPERVISOR: '督办管理员',
  DEPARTMENT_MANAGER: '部门主管',
  DEPARTMENT_LEADER: '部门领导',
  VICE_PRESIDENT: '公司主管领导',
  PRESIDENT: '公司主要领导',
}

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireCurrentUser(request)

  const roles = Object.values(Role).map((role) => ({
    value: role,
    label: ROLE_NAMES[role],
  }))

  return ok(roles)
})
