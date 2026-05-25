import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import {
  canUserHandle,
  ensureMainResponsibleDepartment,
  getProposalFirstApprover,
} from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export async function decomposeTodoWork(
  workItemId: number,
  user: BaseCurrentUser,
  nodes: unknown[],
  comment?: string,
): Promise<Result> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  if (workItem.type !== WorkItemType.TODO) {
    return err(400, '只有待办事项可以分解')
  }

  if (workItem.status !== WorkItemStatus.PENDING_DECOMPOSE) {
    return err(400, '只有待分解事项可以提交分解方案')
  }

  if (!canUserHandle(user, workItem)) {
    return err(403, '无权分解该待办事项')
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return err(403, '只有主责部门可以分解该待办事项')
  }

  const oldStatus = workItem.status
  const approver = getProposalFirstApprover(workItem, user)
  if (!approver) {
    return err(400, '请先指定公司领导后再提交审批')
  }

  await updateWorkItem(workItemId, {
    nodes,
    status: WorkItemStatus.PROPOSING,
    action: ActionType.TODO_DECOMPOSE,
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
    actionType: 'decompose',
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: WorkItemStatus.PROPOSING,
    comment: comment || '提交待办分解方案',
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'decompose',
    module: 'workflow',
    description: `分解待办: ${workItem.title}`,
    targetId: workItemId,
  })

  return ok()
}
