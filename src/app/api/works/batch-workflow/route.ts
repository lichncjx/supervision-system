import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fromError, ok } from '@/shared/http/api-response'
import {
  executeBatchWorkflow,
  type BatchWorkflowInput,
} from '@/features/workflow/application/batch-workflow.usecase'

export const POST = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)
  const body = (await request.json()) as Omit<BatchWorkflowInput, 'currentUser'>
  if (body.action !== 'submit' && body.action !== 'approve') {
    return fromError({ status: 400, message: '无效的批量工作流操作' })
  }

  const result = await executeBatchWorkflow({ ...body, currentUser })
  if (!result.ok) return fromError(result)
  return ok(result.data)
})
