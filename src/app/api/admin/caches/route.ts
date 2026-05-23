import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail } from '@/shared/http/api-response'
import { clearDepartmentCache } from '@/features/departments/infrastructure/department.repository'
import { isAdmin } from '@/features/users/domain/role.rules'

const CACHE_CLEARERS: Record<string, () => void> = {
  departments: clearDepartmentCache,
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  if (!isAdmin(currentUser.role)) {
    return fail('仅管理员可操作', 403, 'FORBIDDEN')
  }

  const body = await request.json().catch(() => ({}))
  const cache = body.cache

  if (!cache || !(cache in CACHE_CLEARERS)) {
    return fail(
      `无效的缓存名称，可用: ${Object.keys(CACHE_CLEARERS).join(', ')}`,
      400,
    )
  }

  CACHE_CLEARERS[cache]()
  return ok({ cleared: cache })
})
