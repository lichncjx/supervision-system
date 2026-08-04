import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import {
  MIN_GRACE_PERIOD_HOURS,
  reconcileAttachmentFilesAsAdminUseCase,
} from '@/features/attachments/application/reconcile-attachment-files.usecase'

const APPLY_CONFIRMATION = 'DELETE_ORPHAN_ATTACHMENT_FILES'

function parseGracePeriodHours(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined

  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < MIN_GRACE_PERIOD_HOURS) return undefined
  return parsed
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  if (currentUser.role !== 'ADMIN') {
    return fail('仅系统管理员可以执行附件存储对账', 403)
  }

  const gracePeriodHours = parseGracePeriodHours(
    request.nextUrl.searchParams.get('gracePeriodHours'),
  )
  if (request.nextUrl.searchParams.has('gracePeriodHours') && gracePeriodHours === undefined) {
    return fail(`gracePeriodHours 不能小于 ${MIN_GRACE_PERIOD_HOURS}`, 400)
  }

  const result = await reconcileAttachmentFilesAsAdminUseCase({
    currentUser,
    gracePeriodHours,
  })
  if (!result.ok) return fromError(result)
  return ok(result.data)
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  if (currentUser.role !== 'ADMIN') {
    return fail('仅系统管理员可以执行附件存储清理', 403)
  }

  let parsedBody: unknown
  try {
    parsedBody = await request.json()
  } catch {
    return fail('请求体必须是有效的 JSON 对象', 400)
  }

  if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
    return fail('请求体必须是有效的 JSON 对象', 400)
  }

  const body = parsedBody as {
    confirm?: string
    gracePeriodHours?: unknown
  }
  if (body.confirm !== APPLY_CONFIRMATION) {
    return fail(`必须提供 confirm=${APPLY_CONFIRMATION} 才能执行清理`, 400)
  }

  const gracePeriodHours = parseGracePeriodHours(body.gracePeriodHours)
  if (body.gracePeriodHours !== undefined && gracePeriodHours === undefined) {
    return fail(`gracePeriodHours 不能小于 ${MIN_GRACE_PERIOD_HOURS}`, 400)
  }

  const result = await reconcileAttachmentFilesAsAdminUseCase({
    currentUser,
    apply: true,
    gracePeriodHours,
  })
  if (!result.ok) return fromError(result)
  return ok(result.data)
})
