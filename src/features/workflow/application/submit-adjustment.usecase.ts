import { ActionType, ApprovalType, WorkItemStatus } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canUserOperate, getProcessFirstApprover } from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export async function submitAdjustment(
  workItemId: number,
  user: BaseCurrentUser,
  adjustReason: string,
  comment?: string,
): Promise<Result> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return err(400, '只有进行中事项可以申请调整')
  }

  // 办理人权限按 firstSubmitterId ?? creatorId 保留，不随当前主责部门人员调整而收回。
  if (!canUserOperate(user, workItem)) {
    return err(403, '无权申请调整')
  }

  const oldStatus = workItem.status
  const approver = getProcessFirstApprover(workItem, user)
  if (!approver) {
    return err(400, '请先指定公司领导后再提交审批')
  }

  await updateWorkItem(workItemId, {
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
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: WorkItemStatus.ADJUSTING,
    comment: comment || '申请调整',
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'adjust',
    module: 'workflow',
    description: `申请调整: ${workItem.title}`,
    targetId: workItemId,
  })

  return ok()
}
