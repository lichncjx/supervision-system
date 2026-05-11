import { toPermissionUser, isApprovalStatus, rejectableBeforeStatus } from '@/features/workflow/domain/workflow.rules'
import type { UserSession, WorkflowResult } from '@/features/workflow/domain/workflow.types'
import { canApproveWorkItem } from '@/features/works/domain/work.permissions'
import {
  findWorkItemById,
  createWorkflowRecord,
  createOperationLog,
  updateWorkItemForWorkflow,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function rejectWorkflowAction(
  workItemId: number,
  user: UserSession,
  rejectReason: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (!isApprovalStatus(workItem.status)) {
    return { success: false, error: '当前状态不允许退回' }
  }

  if (!canApproveWorkItem(toPermissionUser(user), workItem)) {
    return { success: false, error: '无权退回该事项' }
  }

  const targetStatus = rejectableBeforeStatus(workItem)
  if (!targetStatus) {
    return { success: false, error: '退回前状态缺失，无法退回' }
  }

  const oldStatus = workItem.status
  const updated = await updateWorkItemForWorkflow(workItemId, {
    status: targetStatus,
    beforeApprovalStatus: null,
    approvalType: null,
    currentApproverId: null,
    currentApproverRole: null,
    rejectReason,
    rejectedFromStatus: oldStatus,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'reject',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: rejectReason,
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'reject',
    module: 'workflow',
    description: `退回事项: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}
