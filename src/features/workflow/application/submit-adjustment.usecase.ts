import { ActionType, ApprovalType, WorkItemStatus } from '@prisma/client'
import type { UserSession, WorkflowResult } from '@/features/workflow/domain/workflow.types'
import { canUserOperate, getProcessFirstApprover } from '@/features/workflow/domain/workflow.rules'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function submitAdjustment(
  workItemId: number,
  user: UserSession,
  adjustReason: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有进行中事项可以申请调整' }
  }

  if (!canUserOperate(user, workItem)) {
    return { success: false, error: '无权申请调整' }
  }

  const oldStatus = workItem.status
  const approver = getProcessFirstApprover(workItem, user)
  const updated = await updateWorkItem(workItemId, {
    status: WorkItemStatus.ADJUSTING,
    action: ActionType.ADJUST,
    adjustReason,
    beforeApprovalStatus: oldStatus,
    approvalType: ApprovalType.ADJUST,
    currentApproverId: approver.currentApproverId,
    currentApproverRole: approver.currentApproverRole,
    rejectReason: null,
    rejectedFromStatus: null,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'adjust',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '申请调整',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'adjust',
    module: 'workflow',
    description: `申请调整: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}
