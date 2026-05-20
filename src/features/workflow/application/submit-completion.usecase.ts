import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { CurrentUser } from '@/shared/auth/current-user'
import type { WorkflowResult } from '@/features/workflow/domain/workflow.types'
import {
  canUserOperate,
  companyLeaderAssignment,
  getProcessFirstApprover,
} from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function submitCompletion(
  workItemId: number,
  user: CurrentUser,
  proof: string,
  comment?: string,
): Promise<WorkflowResult> {
  const permUser = toPermissionUser(user)
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

  const oldStatus = workItem.status
  const approver =
    workItem.type === WorkItemType.TODO
      ? companyLeaderAssignment(workItem, 'approval')
      : getProcessFirstApprover(workItem, user)
  if (!approver) {
    return { success: false, error: '请先指定公司领导后再提交审批' }
  }

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
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '提交完成申请',
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'evidence',
    module: 'workflow',
    description: `提交完成申请: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}
