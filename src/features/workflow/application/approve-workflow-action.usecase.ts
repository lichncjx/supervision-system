import { APPROVAL_TARGET_STATUS } from '@/features/workflow/domain/workflow.constants'
import { isApprovalStatus } from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import type { CurrentUser } from '@/shared/auth/current-user'
import type { WorkflowResult } from '@/features/workflow/domain/workflow.types'
import { canApproveWorkItem } from '@/features/works/domain/work.permissions'
import { isCompanyLevel } from '@/features/users/domain/role.rules'
import { getNextApprovalAssignment } from './workflow-assignment.service'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import { findActiveCompanyLeaderById } from '@/features/users/infrastructure/user.repository'
import {
  createWorkflowRecord,
  createOperationLog,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function approveWorkflowAction(
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

  if (!isApprovalStatus(workItem.status)) {
    return { success: false, error: '当前状态不允许审批' }
  }

  if (!canApproveWorkItem(permUser, workItem)) {
    return { success: false, error: '无权审批该事项' }
  }

  if (!workItem.approvalType) {
    return { success: false, error: '审批类型缺失，无法继续流转' }
  }

  if (nextApproverId != null) {
    const nextApproverUser = await findActiveCompanyLeaderById(nextApproverId)
    if (!nextApproverUser) {
      return { success: false, error: '下一审批人必须是在用的公司领导' }
    }
  }

  const oldStatus = workItem.status
  const nextApprover = await getNextApprovalAssignment(
    workItem,
    workItem.approvalType,
    nextApproverId,
  )

  if (nextApprover) {
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

    return { success: true, workItem: updated }
  }

  const targetStatus = APPROVAL_TARGET_STATUS[workItem.approvalType]
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

  return { success: true, workItem: updated }
}
