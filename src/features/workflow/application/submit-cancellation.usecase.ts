import { ActionType, ApprovalType, WorkItemStatus } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import {
  canUserOperate,
  getProcessFirstApprover,
} from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export async function submitCancellation(
  workItemId: number,
  user: BaseCurrentUser,
  cancelReason: string,
  comment?: string,
): Promise<Result> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return err(400, '只有进行中事项可以申请取消')
  }

  // 进行中事项办理权归属 responsiblePersonUserId，不随全局查看权限放开。
  if (!canUserOperate(user, workItem)) {
    return err(403, '无权申请取消')
  }

  const oldStatus = workItem.status
  const approver = getProcessFirstApprover(workItem, user)
  if (!approver) {
    return err(400, '请先指定公司领导后再提交审批')
  }

  await updateWorkItem(workItemId, {
    status: WorkItemStatus.CANCELLING,
    action: ActionType.CANCEL,
    cancelReason,
    beforeApprovalStatus: oldStatus,
    approvalType: ApprovalType.CANCEL,
    currentApproverId: approver.currentApproverId,
    currentApproverRole: approver.currentApproverRole,
    rejectReason: null,
    rejectedFromStatus: null,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'cancel',
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: WorkItemStatus.CANCELLING,
    comment: comment || '申请取消',
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'cancel',
    module: 'workflow',
    description: `申请取消: ${workItem.title}`,
    targetId: workItemId,
  })

  return ok()
}
