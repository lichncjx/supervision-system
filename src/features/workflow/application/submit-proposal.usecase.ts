import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { CurrentUser } from '@/shared/auth/current-user'
import type { WorkflowResult } from '@/features/workflow/domain/workflow.types'
import { getProposalFirstApprover, canUserSubmit } from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import { isCompanyLevel } from '@/features/users/domain/role.rules'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function submitProposal(
  workItemId: number,
  user: CurrentUser,
  comment?: string,
  nextApproverId?: number | null,
): Promise<WorkflowResult> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status !== WorkItemStatus.DRAFT) {
    return { success: false, error: '只有草稿事项可以提交审批' }
  }

  if (!canUserSubmit(workItem, user)) {
    return { success: false, error: '无权提交该事项' }
  }

  const oldStatus = workItem.status

  if (
    workItem.type === WorkItemType.TODO &&
    isCompanyLevel(user.role)
  ) {
    const updated = await updateWorkItem(workItemId, {
      status: WorkItemStatus.PENDING_DECOMPOSE,
      action: ActionType.TODO_DECOMPOSE,
      beforeApprovalStatus: null,
      approvalType: null,
      currentApproverId: null,
      currentApproverRole: null,
      rejectReason: null,
      rejectedFromStatus: null,
    })

    await createWorkflowRecord({
      workItemId,
      actionType: 'submit',
      operatorId: user.id,
      operatorRole: permUser.role,
      statusBefore: oldStatus,
      statusAfter: updated.status,
      comment: comment || '提交待办分解',
    })
    await createOperationLog({
      userId: user.id,
      userName: user.name,
      userRole: permUser.role,
      operationType: 'submit',
      module: 'workflow',
      description: `提交事项: ${workItem.title}`,
      targetId: workItemId,
    })

    return { success: true, workItem: updated }
  }

  const approver = getProposalFirstApprover(workItem, user, nextApproverId)
  if (!approver) {
    return { success: false, error: '请先指定公司领导后再提交审批' }
  }

  const updated = await updateWorkItem(workItemId, {
    status: WorkItemStatus.PROPOSING,
    action: ActionType.CREATE,
    beforeApprovalStatus: oldStatus,
    approvalType: ApprovalType.PROPOSE,
    currentApproverId: approver.currentApproverId,
    currentApproverRole: approver.currentApproverRole,
    firstSubmitterId: workItem.firstSubmitterId ?? user.id,
    rejectReason: null,
    rejectedFromStatus: null,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'submit',
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '提交审批',
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'submit',
    module: 'workflow',
    description: `提交事项: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}
