import { rejectableBeforeStatus } from '@/features/workflow/domain/workflow.rules'
import { ApprovalType } from '@prisma/client'
import { isApproving } from '@/features/works/domain/work-status.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canApproveWorkItem } from '@/features/works/domain/work.permissions'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
  rejectAdjustment,
} from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export async function rejectWorkflowAction(
  workItemId: number,
  user: BaseCurrentUser,
  rejectReason: string,
): Promise<Result> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  if (!isApproving(workItem.status)) {
    return err(400, '当前状态不允许退回')
  }

  if (!canApproveWorkItem(permUser, workItem)) {
    return err(403, '无权退回该事项')
  }

  const targetStatus = rejectableBeforeStatus(workItem)
  if (!targetStatus) {
    return err(400, '退回前状态缺失，无法退回')
  }

  const oldStatus = workItem.status
  await updateWorkItem(workItemId, {
    status: targetStatus,
    beforeApprovalStatus: null,
    approvalType: null,
    currentApproverId: null,
    currentApproverRole: null,
    rejectReason,
    rejectedFromStatus: oldStatus,
  })

  if (workItem.approvalType === ApprovalType.ADJUST) {
    await rejectAdjustment({
      workItemId,
      rejectedById: user.id,
      rejectReason,
    })
  }

  await createWorkflowRecord({
    workItemId,
    actionType: 'reject',
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: targetStatus,
    comment: rejectReason,
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'reject',
    module: 'workflow',
    description: `退回事项: ${workItem.title}`,
    targetId: workItemId,
  })

  return ok()
}
