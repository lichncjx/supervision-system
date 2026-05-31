import { ApprovalType } from '@prisma/client'
import { getTargetStatus, getNextApprovalAssignment } from '@/features/workflow/domain/workflow.rules'
import { isApproving } from '@/features/works/domain/work-status.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canApproveWorkItem } from '@/features/works/domain/work.permissions'
import { isCompanyLevel } from '@/features/users/domain/role.rules'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import { ensureIsActiveCompanyLeader } from './workflow-next-approver.guard'
import {
  buildAdjustHistoryEntry,
  buildAdjustmentWorkUpdateData,
  type AdjustmentPatch,
} from '@/features/workflow/application/adjustment-patch'
import {
  createWorkflowRecord,
  createOperationLog,
  findPresident,
  findAdjustment,
  approveAdjustment,
} from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

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
  let adjustmentUpdateData: Record<string, unknown> = {}
  let approvedAdjustmentRequestId: number | null = null

  if (workItem.approvalType === ApprovalType.ADJUST) {
    const adjustmentRequest = await findAdjustment(workItemId)
    if (!adjustmentRequest) {
      return err(400, '调整申请内容缺失，无法审批通过')
    }

    const patch = adjustmentRequest.patch as AdjustmentPatch
    const beforeSnapshot = adjustmentRequest.beforeSnapshot as AdjustmentPatch
    const currentHistory = parseJsonField<unknown[]>(workItem.adjustHistory, [])
    adjustmentUpdateData = {
      ...buildAdjustmentWorkUpdateData(patch),
      adjustHistory: [
        ...currentHistory,
        buildAdjustHistoryEntry({
          beforeSnapshot,
          patch,
          reason: adjustmentRequest.reason,
          approvedBy: user.name,
        }),
      ],
    }
    approvedAdjustmentRequestId = adjustmentRequest.id
  }

  const updated = await updateWorkItem(workItemId, {
    ...adjustmentUpdateData,
    status: targetStatus,
    beforeApprovalStatus: null,
    approvalType: null,
    currentApproverId: null,
    currentApproverRole: null,
    ...(isCompanyLevel(user.role) && workItem.approvalType === ApprovalType.PROPOSE ? { approvalLeaderId: user.id } : {}),
  })

  if (approvedAdjustmentRequestId) {
    await approveAdjustment({
      requestId: approvedAdjustmentRequestId,
      approvedById: user.id,
    })
  }

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
