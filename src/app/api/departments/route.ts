import { NextRequest } from 'next/server'
import { prisma } from '@/shared/db/prisma'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok } from '@/shared/http/api-response'

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireCurrentUser(request)

  const departments = await prisma.department.findMany({
    orderBy: { id: 'asc' },
  })

  return ok(departments)
})
