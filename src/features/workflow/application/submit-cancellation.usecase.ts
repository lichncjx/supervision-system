import { ActionType, ApprovalType, WorkItemStatus } from '@prisma/client'
import type { UserSession, WorkflowResult } from '@/features/workflow/domain/workflow.types'
import {
  canUserHandle,
  canUserCancelDraft,
  ensureMainResponsibleDepartment,
  getProcessFirstApprover,
} from '@/features/workflow/domain/workflow.rules'
import {
  findWorkItemById,
  createWorkflowRecord,
  createOperationLog,
  updateWorkItemForWorkflow,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function submitCancellation(
  workItemId: number,
  user: UserSession,
  cancelReason: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status === WorkItemStatus.DRAFT) {
    if (!canUserCancelDraft(user, workItem)) {
      return { success: false, error: '无权取消该草稿事项' }
    }

    const updated = await updateWorkItemForWorkflow(workItemId, {
      status: WorkItemStatus.CANCELLED,
      action: ActionType.CANCEL,
      cancelReason,
      beforeApprovalStatus: null,
      approvalType: null,
      currentApproverId: null,
      currentApproverRole: null,
    })

    await createWorkflowRecord({
      workItemId,
      actionType: 'cancel',
      operatorId: user.userId,
      operatorRole: user.role,
      statusBefore: workItem.status,
      statusAfter: updated.status,
      comment: comment || '取消草稿事项',
    })
    await createOperationLog({
      userId: user.userId,
      userName: user.userName,
      userRole: user.role,
      operationType: 'cancel',
      module: 'workflow',
      description: `取消事项: ${workItem.title}`,
      targetId: workItemId,
    })

    return { success: true, workItem: updated }
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有草稿或进行中事项可以申请取消' }
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权申请取消' }
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return { success: false, error: '只有主责部门可以申请取消' }
  }

  const oldStatus = workItem.status
  const approver = getProcessFirstApprover(workItem, user)
  const updated = await updateWorkItemForWorkflow(workItemId, {
    status: WorkItemStatus.CANCELLING,
    action: ActionType.CANCEL,
    cancelReason,
    beforeApprovalStatus: oldStatus,
    approvalType: ApprovalType.CANCEL,
    currentApproverId: approver.currentApproverId,
    currentApproverRole: approver.currentApproverRole,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'cancel',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '申请取消',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'cancel',
    module: 'workflow',
    description: `申请取消: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}
