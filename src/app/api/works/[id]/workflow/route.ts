import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
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
export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    const workItemId = parseInt(id)

    if (isNaN(workItemId)) {
      return fail('无效的事项ID', 400)
    }

    const currentUser = await requireCurrentUser(request)
    const body = await request.json()

    let result

    switch (body.action) {
      case 'submit':
        if (body.nextApproverId != null && (!Number.isInteger(body.nextApproverId) || body.nextApproverId <= 0)) {
          return fail('无效的下一审批人', 400)
        }
        result = await submitProposal(workItemId, currentUser, body.comment, body.nextApproverId)
        break
      case 'approve':
        if (body.nextApproverId != null && (!Number.isInteger(body.nextApproverId) || body.nextApproverId <= 0)) {
          return fail('无效的下一审批人', 400)
        }
        result = await approveWorkflowAction(workItemId, currentUser, body.comment, body.nextApproverId)
        break
      case 'reject':
        if (!body.rejectReason) {
          return fail('请提供退回原因', 400)
        }
        result = await rejectWorkflowAction(workItemId, currentUser, body.rejectReason)
        break
      case 'evidence':
      case 'complete':
        if (!body.proof) {
          return fail('请提供见证材料说明', 400)
        }
        result = await submitCompletion(workItemId, currentUser, body.proof, body.comment)
        break
      case 'adjust':
        if (!body.adjustReason) {
          return fail('请提供调整原因', 400)
        }
        if (!body.pendingAdjustment || typeof body.pendingAdjustment !== 'object') {
          return fail('请提供拟调整内容', 400)
        }
        result = await submitAdjustment(
          workItemId,
          currentUser,
          body.adjustReason,
          body.pendingAdjustment,
          body.comment,
        )
        break
      case 'cancel':
        if (!body.cancelReason) {
          return fail('请提供取消原因', 400)
        }
        result = await submitCancellation(workItemId, currentUser, body.cancelReason, body.comment)
        break
      case 'decompose':
        if (!body.nodes || !Array.isArray(body.nodes)) {
          return fail('请提供分解节点', 400)
        }
        result = await decomposeTodoWork(
          workItemId,
          currentUser,
          body.nodes,
          body.comment,
          body.responsibleLeaderUserId ?? null,
          body.responsiblePersonUserId ?? null,
          body.responsibleLeader ?? null,
          body.responsiblePerson ?? null,
        )
        break
      default:
        return fail('无效的操作', 400)
    }

    if (!result.ok) return fromError(result)

    return ok()
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
    if (!result.ok) return fromError(result)

    return ok(result.data)
  },
)
