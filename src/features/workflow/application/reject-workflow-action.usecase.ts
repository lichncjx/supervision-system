import { isApprovalStatus, rejectableBeforeStatus } from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import type { CurrentUser } from '@/shared/auth/current-user'
import type { WorkflowResult } from '@/features/workflow/domain/workflow.types'
import { canApproveWorkItem } from '@/features/works/domain/work.permissions'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function rejectWorkflowAction(
  workItemId: number,
  user: CurrentUser,
  rejectReason: string,
): Promise<WorkflowResult> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (!isApprovalStatus(workItem.status)) {
    return { success: false, error: '当前状态不允许退回' }
  }

  if (!canApproveWorkItem(permUser, workItem)) {
    return { success: false, error: '无权退回该事项' }
  }

  const targetStatus = rejectableBeforeStatus(workItem)
  if (!targetStatus) {
    return { success: false, error: '退回前状态缺失，无法退回' }
  }

  const oldStatus = workItem.status
  const updated = await updateWorkItem(workItemId, {
    status: targetStatus,
    beforeApprovalStatus: null,
    approvalType: null,
    currentApproverId: null,
    currentApproverRole: null,
    rejectReason,
    rejectedFromStatus: oldStatus,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'reject',
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
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

  return { success: true, workItem: updated }
}
