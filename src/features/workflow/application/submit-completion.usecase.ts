import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { UserSession, WorkflowResult } from '@/features/workflow/domain/workflow.types'
import {
  canUserOperate,
  companyLeaderAssignment,
  ensureMainResponsibleDepartment,
  getProcessFirstApprover,
} from '@/features/workflow/domain/workflow.rules'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function submitCompletion(
  workItemId: number,
  user: UserSession,
  proof: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有进行中事项可以提交完成申请' }
  }

  if (!canUserOperate(user, workItem)) {
    return { success: false, error: '无权提交完成申请' }
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return { success: false, error: '只有主责部门可以提交完成申请' }
  }

  const oldStatus = workItem.status
  const approver =
    workItem.type === WorkItemType.TODO
      ? companyLeaderAssignment(workItem, 'approval')
      : getProcessFirstApprover(workItem, user)

  const updated = await updateWorkItem(workItemId, {
    status: WorkItemStatus.COMPLETING,
    action: ActionType.COMPLETE,
    proof,
    beforeApprovalStatus: oldStatus,
    approvalType: ApprovalType.COMPLETE,
    currentApproverId: approver.currentApproverId,
    currentApproverRole: approver.currentApproverRole,
    rejectReason: null,
    rejectedFromStatus: null,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'evidence',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '提交完成申请',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'evidence',
    module: 'workflow',
    description: `提交完成申请: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}
