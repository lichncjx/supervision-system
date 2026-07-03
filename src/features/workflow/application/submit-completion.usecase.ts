import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
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
import { type Result, err, ok } from '@/shared/result'

export async function submitCompletion(
  workItemId: number,
  user: BaseCurrentUser,
  proof: string,
  comment?: string,
): Promise<Result> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return err(400, '只有进行中事项可以提交完成申请')
  }

  // 进行中事项办理权归属 responsiblePersonUserId，不随全局查看权限放开。
  if (!canUserOperate(user, workItem)) {
    return err(403, '无权提交完成申请')
  }

  const oldStatus = workItem.status
  const approver =
    workItem.type === WorkItemType.TODO
      ? companyLeaderAssignment(workItem, 'approval')
      : getProcessFirstApprover(workItem, user)
  if (!approver) {
    return err(400, '请先指定公司领导后再提交审批')
  }

  await updateWorkItem(workItemId, {
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
    statusAfter: WorkItemStatus.COMPLETING,
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

  return ok()
}
