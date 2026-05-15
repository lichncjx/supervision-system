import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { UserSession, WorkflowResult } from '@/features/workflow/domain/workflow.types'
import {
  canUserHandle,
  ensureMainResponsibleDepartment,
  getProposalFirstApprover,
} from '@/features/workflow/domain/workflow.rules'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function decomposeTodoWork(
  workItemId: number,
  user: UserSession,
  nodes: any[],
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.type !== WorkItemType.TODO) {
    return { success: false, error: '只有待办事项可以分解' }
  }

  if (workItem.status !== WorkItemStatus.PENDING_DECOMPOSE) {
    return { success: false, error: '只有待分解事项可以提交分解方案' }
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权分解该待办事项' }
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return { success: false, error: '只有主责部门可以分解该待办事项' }
  }

  const oldStatus = workItem.status
  const approver = getProposalFirstApprover(workItem, user)
  const updated = await updateWorkItem(workItemId, {
    nodes,
    status: WorkItemStatus.PROPOSING,
    action: ActionType.TODO_DECOMPOSE,
    beforeApprovalStatus: oldStatus,
    approvalType: ApprovalType.PROPOSE,
    currentApproverId: approver.currentApproverId,
    currentApproverRole: approver.currentApproverRole,
    firstSubmitterId: workItem.firstSubmitterId ?? user.userId,
    rejectReason: null,
    rejectedFromStatus: null,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'decompose',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '提交待办分解方案',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'decompose',
    module: 'workflow',
    description: `分解待办: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}
