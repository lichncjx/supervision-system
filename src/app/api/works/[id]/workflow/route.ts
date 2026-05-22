import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { ok, fail, fromError } from '@/shared/http/api-response'
import { submitProposal } from '@/features/workflow/application/submit-proposal.usecase'
import { approveWorkflowAction } from '@/features/workflow/application/approve-workflow-action.usecase'
import { rejectWorkflowAction } from '@/features/workflow/application/reject-workflow-action.usecase'
import { submitCompletion } from '@/features/workflow/application/submit-completion.usecase'
import { submitAdjustment } from '@/features/workflow/application/submit-adjustment.usecase'
import { submitCancellation } from '@/features/workflow/application/submit-cancellation.usecase'
import { decomposeTodoWork } from '@/features/workflow/application/decompose-todo-work.usecase'
import { getWorkflowRecords } from '@/features/workflow/application/get-workflow-records.usecase'
import type { WorkflowActionRequest } from '@/features/workflow/contract/workflow-api.types'
import type { WorkflowResult } from '@/features/workflow/domain/workflow.types'

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const workItemId = parseInt(id)

    if (isNaN(workItemId)) {
      return fail('无效的事项ID', 400)
    }

    const currentUser = await requireCurrentUser(request)

    const body = (await request.json()) as WorkflowActionRequest
    const {
      action,
      comment,
      proof,
      adjustReason,
      cancelReason,
      rejectReason,
      nodes,
      nextApproverId,
    } = body

    if (
      nextApproverId != null &&
      (!Number.isInteger(nextApproverId) || nextApproverId <= 0)
    ) {
      return fail('无效的下一审批人', 400)
    }

    let result: WorkflowResult

    switch (action) {
      case 'submit':
        result = await submitProposal(workItemId, currentUser, comment, nextApproverId)
        break
      case 'approve':
        result = await approveWorkflowAction(workItemId, currentUser, comment, nextApproverId)
        break
      case 'reject':
        if (!rejectReason) {
          return fail('请提供退回原因', 400)
        }
        result = await rejectWorkflowAction(workItemId, currentUser, rejectReason)
        break
      case 'evidence':
      case 'complete':
        if (!proof) {
          return fail('请提供见证材料说明', 400)
        }
        result = await submitCompletion(workItemId, currentUser, proof, comment)
        break
      case 'adjust':
        if (!adjustReason) {
          return fail('请提供调整原因', 400)
        }
        result = await submitAdjustment(workItemId, currentUser, adjustReason, comment)
        break
      case 'cancel':
        if (!cancelReason) {
          return fail('请提供取消原因', 400)
        }
        result = await submitCancellation(workItemId, currentUser, cancelReason, comment)
        break
      case 'decompose':
        if (!nodes || !Array.isArray(nodes)) {
          return fail('请提供分解节点', 400)
        }
        result = await decomposeTodoWork(workItemId, currentUser, nodes, comment)
        break
      default:
        return fail('无效的操作', 400)
    }

    if (!result.success) {
      return fail(result.error ?? '操作失败', 400)
    }

    return ok({ success: true, workItem: result.workItem })
  },
)

export const GET = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const workItemId = parseInt(id)

    if (isNaN(workItemId)) {
      return fail('无效的事项ID', 400)
    }

    const currentUser = await requireCurrentUser(request)

    const result = await getWorkflowRecords(currentUser, workItemId)
    if (result.kind === 'error') return fromError(result)

    return ok(result.data)
  },
)
