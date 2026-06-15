import { ActionType, ApprovalType, WorkItemStatus, WorkItemType } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import {
  canUserHandle,
  ensureMainResponsibleDepartment,
  getProposalFirstApprover,
} from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import { findUserById } from '@/features/users/infrastructure/user.repository'
import {
  isValidResponsibleLeaderUser,
  isValidResponsiblePersonUser,
} from '@/features/users/domain/responsible-user.rules'
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
  responsibleLeaderUserId?: number | null,
  responsiblePersonUserId?: number | null,
  responsibleLeader?: string | null,
  responsiblePerson?: string | null,
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

  if (!responsiblePersonUserId) {
    return err(400, '请先指定责任人后再提交分解方案')
  }

  // Validate responsiblePersonUserId belongs to the work item's department
  const personUser = await findUserById(responsiblePersonUserId)
  if (!personUser || !personUser.isActive) {
    return err(400, '责任人用户不存在或已禁用')
  }
  if (personUser.departmentId !== workItem.departmentId) {
    return err(400, '责任人不属于该责任部门')
  }
  if (!isValidResponsiblePersonUser(personUser)) {
    return err(400, '责任人不能是部门领导')
  }

  // Validate responsibleLeaderUserId if provided
  if (responsibleLeaderUserId) {
    const leaderUser = await findUserById(responsibleLeaderUserId)
    if (!leaderUser || !leaderUser.isActive) {
      return err(400, '责任领导用户不存在或已禁用')
    }
    if (leaderUser.departmentId !== workItem.departmentId) {
      return err(400, '责任领导不属于该责任部门')
    }
    if (!isValidResponsibleLeaderUser(leaderUser)) {
      return err(400, '责任领导必须是部门领导')
    }
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
    responsibleLeaderUserId: responsibleLeaderUserId ?? null,
    responsiblePersonUserId: responsiblePersonUserId ?? null,
    responsibleLeader: responsibleLeader ?? null,
    responsiblePerson: responsiblePerson ?? null,
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
