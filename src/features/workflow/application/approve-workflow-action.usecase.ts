import { getTargetStatus, getNextApprovalAssignment } from '@/features/workflow/domain/workflow.rules'
import { isApproving } from '@/features/works/domain/work-status.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canApproveWorkItem } from '@/features/works/domain/work.permissions'
import { isCompanyLevel } from '@/features/users/domain/role.rules'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import { ensureIsActiveCompanyLeader } from './workflow-next-approver.guard'
import {
  createWorkflowRecord,
  createOperationLog,
  findPresident,
} from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export async function approveWorkflowAction(
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

  if (!isApproving(workItem.status)) {
    return err(400, '当前状态不允许审批')
  }

  if (!canApproveWorkItem(permUser, workItem)) {
    return err(403, '无权审批该事项')
  }

  if (!workItem.approvalType) {
    return err(400, '审批类型缺失，无法继续流转')
  }

  const nextApproverError = await ensureIsActiveCompanyLeader(nextApproverId)
  if (nextApproverError) return nextApproverError

  const oldStatus = workItem.status
  const president = await findPresident()
  const nextAssignment = getNextApprovalAssignment(
    workItem,
    workItem.approvalType,
    president?.id ?? null,
    nextApproverId ?? null,
  )

  if (nextAssignment.kind === 'missingCompanyLeader') {
    return err(400, '请先指定公司领导后再提交审批')
  }

  if (nextAssignment.kind === 'next') {
    const nextApprover = nextAssignment.approver

    const updated = await updateWorkItem(workItemId, {
      currentApproverId: nextApprover.currentApproverId,
      currentApproverRole: nextApprover.currentApproverRole,
    })

    await createWorkflowRecord({
      workItemId,
      actionType: 'approve',
      operatorId: user.id,
      operatorRole: permUser.role,
      statusBefore: oldStatus,
      statusAfter: updated.status,
      comment: comment || '审批通过，流转至下一节点',
    })
    await createOperationLog({
      userId: user.id,
      userName: user.name,
      userRole: permUser.role,
      operationType: 'approve',
      module: 'workflow',
      description: `审批通过: ${workItem.title}`,
      targetId: workItemId,
    })

    return ok()
  }

  const targetStatus = getTargetStatus(workItem.approvalType)
  const updated = await updateWorkItem(workItemId, {
    status: targetStatus,
    beforeApprovalStatus: null,
    approvalType: null,
    currentApproverId: null,
    currentApproverRole: null,
    ...(isCompanyLevel(user.role) && workItem.approvalType === 'PROPOSE' ? { approvalLeaderId: user.id } : {}),
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'approve',
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '审批通过',
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'approve',
    module: 'workflow',
    description: `审批通过: ${workItem.title}`,
    targetId: workItemId,
  })

  return ok()
}
