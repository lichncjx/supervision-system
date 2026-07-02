import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { getProposalFirstApprover, canUserSubmit } from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import { isCompanyLevel } from '@/features/users/domain/role.rules'
import { ensureIsActiveCompanyLeader } from './workflow-next-approver.guard'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export async function submitProposal(
  workItemId: number,
  user: BaseCurrentUser,
  comment?: string,
  nextApproverId?: number | null,
): Promise<Result> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  if (workItem.status !== WorkItemStatus.DRAFT) {
    return err(400, '只有草稿事项可以提交审批')
  }

  if (!canUserSubmit(workItem, user)) {
    return err(403, '无权提交该事项')
  }

  const oldStatus = workItem.status
  const isCompanyTodoDraft =
    workItem.type === WorkItemType.TODO &&
    isCompanyLevel(user.role)

  if (isCompanyTodoDraft) {
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

    return ok()
  }

  if (!workItem.responsiblePersonUserId) {
    return err(400, '请先指定责任人后再提交审批')
  }

  const nextApproverError = await ensureIsActiveCompanyLeader(nextApproverId)
  if (nextApproverError) return nextApproverError

  const approver = getProposalFirstApprover(workItem, user, nextApproverId)
  if (!approver) {
    return err(400, '请先指定公司领导后再提交审批')
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

  return ok()
}
