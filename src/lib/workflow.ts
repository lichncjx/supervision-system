import {
  ActionType,
  ApprovalType,
  Prisma,
  Role,
  WorkItemStatus,
  WorkItemType,
} from '@prisma/client'
import prisma from '@/lib/prisma'
import type {
  UserSession,
  WorkflowResult,
  ApproverAssignment,
} from '@/features/workflow/domain/workflow.types'
import {
  APPROVAL_TARGET_STATUS,
} from '@/features/workflow/domain/workflow.constants'
import {
  toPermissionUser,
  isApprovalStatus,
  companyLeaderAssignment,
  getProposalFirstApprover,
  getProcessFirstApprover,
  shouldEscalateCancelToPresident,
  isDepartmentApprovalNode,
  isPresidentApprovalNode,
  canUserHandle,
  canUserCancelDraft,
  ensureMainResponsibleDepartment,
  rejectableBeforeStatus,
  canUserSubmit,
} from '@/features/workflow/domain/workflow.rules'

import {
  canApproveWorkItem,
} from '@/features/works/domain/work.permissions'

import {
  findWorkItemById,
  createWorkflowRecord,
  createOperationLog,
  findPresidentUser,
  findWorkflowRecordsByWorkItemId,
  type WorkflowWorkItem,
} from '@/features/workflow/infrastructure/workflow.repository'

export type { UserSession, WorkflowResult } from '@/features/workflow/domain/workflow.types'
export {
  canUserApprove,
  canUserSubmit,
} from '@/features/workflow/domain/workflow.rules'

async function presidentAssignment(): Promise<ApproverAssignment> {
  const president = await findPresidentUser()

  return {
    currentApproverId: president?.id ?? null,
    currentApproverRole: Role.PRESIDENT,
  }
}

async function getNextApprovalAssignment(
  workItem: WorkflowWorkItem,
  approvalType: ApprovalType,
): Promise<ApproverAssignment | null> {
  if (approvalType === ApprovalType.PROPOSE) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'propose')
    }
    return null
  }

  if (
    approvalType === ApprovalType.ADJUST ||
    approvalType === ApprovalType.COMPLETE
  ) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval')
    }
    return null
  }

  if (approvalType === ApprovalType.CANCEL) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval')
    }

    if (
      shouldEscalateCancelToPresident(workItem) &&
      !isPresidentApprovalNode(workItem)
    ) {
      return presidentAssignment()
    }

    return null
  }

  return null
}

export async function submitForApproval(
  workItemId: number,
  user: UserSession,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status !== WorkItemStatus.DRAFT) {
    return { success: false, error: '只有草稿事项可以提交审批' }
  }

  if (!canUserSubmit(workItem, user)) {
    return { success: false, error: '无权提交该事项' }
  }

  const oldStatus = workItem.status

  if (
    workItem.type === WorkItemType.TODO &&
    (user.role === Role.VICE_PRESIDENT || user.role === Role.PRESIDENT)
  ) {
    const updated = await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        status: WorkItemStatus.PENDING_DECOMPOSE,
        action: ActionType.TODO_DECOMPOSE,
        beforeApprovalStatus: null,
        approvalType: null,
        currentApproverId: null,
        currentApproverRole: null,
        rejectReason: null,
        rejectedFromStatus: null,
      },
    })

    await createWorkflowRecord({
      workItemId,
      actionType: 'submit',
      operatorId: user.userId,
      operatorRole: user.role,
      statusBefore: oldStatus,
      statusAfter: updated.status,
      comment: comment || '提交待办分解',
    })
    await createOperationLog({
      userId: user.userId,
      userName: user.userName,
      userRole: user.role,
      operationType: 'submit',
      module: 'workflow',
      description: `提交事项: ${workItem.title}`,
      targetId: workItemId,
    })

    return { success: true, workItem: updated }
  }

  const approver = getProposalFirstApprover(workItem, user)
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.PROPOSING,
      action: ActionType.CREATE,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.PROPOSE,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
      firstSubmitterId: workItem.firstSubmitterId ?? user.userId,
      rejectReason: null,
      rejectedFromStatus: null,
    },
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'submit',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '提交审批',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'submit',
    module: 'workflow',
    description: `提交事项: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}

export async function approveWorkItem(
  workItemId: number,
  user: UserSession,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (!isApprovalStatus(workItem.status)) {
    return { success: false, error: '当前状态不允许审批' }
  }

  if (!canApproveWorkItem(toPermissionUser(user), workItem)) {
    return { success: false, error: '无权审批该事项' }
  }

  if (!workItem.approvalType) {
    return { success: false, error: '审批类型缺失，无法继续流转' }
  }

  const oldStatus = workItem.status
  const nextApprover = await getNextApprovalAssignment(
    workItem,
    workItem.approvalType,
  )

  if (nextApprover) {
    const updated = await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        currentApproverId: nextApprover.currentApproverId,
        currentApproverRole: nextApprover.currentApproverRole,
      },
    })

    await createWorkflowRecord({
      workItemId,
      actionType: 'approve',
      operatorId: user.userId,
      operatorRole: user.role,
      statusBefore: oldStatus,
      statusAfter: updated.status,
      comment: comment || '审批通过，流转至下一节点',
    })
    await createOperationLog({
      userId: user.userId,
      userName: user.userName,
      userRole: user.role,
      operationType: 'approve',
      module: 'workflow',
      description: `审批通过: ${workItem.title}`,
      targetId: workItemId,
    })

    return { success: true, workItem: updated }
  }

  const targetStatus = APPROVAL_TARGET_STATUS[workItem.approvalType]
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: targetStatus,
      beforeApprovalStatus: null,
      approvalType: null,
      currentApproverId: null,
      currentApproverRole: null,
    },
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'approve',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '审批通过',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'approve',
    module: 'workflow',
    description: `审批通过: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}

export async function rejectWorkItem(
  workItemId: number,
  user: UserSession,
  rejectReason: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (!isApprovalStatus(workItem.status)) {
    return { success: false, error: '当前状态不允许退回' }
  }

  if (!canApproveWorkItem(toPermissionUser(user), workItem)) {
    return { success: false, error: '无权退回该事项' }
  }

  const targetStatus = rejectableBeforeStatus(workItem)
  if (!targetStatus) {
    return { success: false, error: '退回前状态缺失，无法退回' }
  }

  const oldStatus = workItem.status
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: targetStatus,
      beforeApprovalStatus: null,
      approvalType: null,
      currentApproverId: null,
      currentApproverRole: null,
      rejectReason,
      rejectedFromStatus: oldStatus,
    },
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'reject',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: rejectReason,
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'reject',
    module: 'workflow',
    description: `退回事项: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}

export async function submitEvidence(
  workItemId: number,
  user: UserSession,
  proof: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有进行中事项可以提交完成申请' }
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权提交完成申请' }
  }

  const oldStatus = workItem.status
  const approver =
    workItem.type === WorkItemType.TODO
      ? companyLeaderAssignment(workItem, 'approval')
      : getProcessFirstApprover(workItem, user)

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.COMPLETING,
      action: ActionType.COMPLETE,
      proof,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.COMPLETE,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
    },
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'evidence',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '提交完成申请',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'evidence',
    module: 'workflow',
    description: `提交完成申请: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}

export async function submitAdjust(
  workItemId: number,
  user: UserSession,
  adjustReason: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有进行中事项可以申请调整' }
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权申请调整' }
  }

  const oldStatus = workItem.status
  const approver = getProcessFirstApprover(workItem, user)
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.ADJUSTING,
      action: ActionType.ADJUST,
      adjustReason,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.ADJUST,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
    },
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'adjust',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '申请调整',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'adjust',
    module: 'workflow',
    description: `申请调整: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}

export async function submitCancel(
  workItemId: number,
  user: UserSession,
  cancelReason: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.status === WorkItemStatus.DRAFT) {
    if (!canUserCancelDraft(user, workItem)) {
      return { success: false, error: '无权取消该草稿事项' }
    }

    const updated = await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        status: WorkItemStatus.CANCELLED,
        action: ActionType.CANCEL,
        cancelReason,
        beforeApprovalStatus: null,
        approvalType: null,
        currentApproverId: null,
        currentApproverRole: null,
      },
    })

    await createWorkflowRecord({
      workItemId,
      actionType: 'cancel',
      operatorId: user.userId,
      operatorRole: user.role,
      statusBefore: workItem.status,
      statusAfter: updated.status,
      comment: comment || '取消草稿事项',
    })
    await createOperationLog({
      userId: user.userId,
      userName: user.userName,
      userRole: user.role,
      operationType: 'cancel',
      module: 'workflow',
      description: `取消事项: ${workItem.title}`,
      targetId: workItemId,
    })

    return { success: true, workItem: updated }
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有草稿或进行中事项可以申请取消' }
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权申请取消' }
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return { success: false, error: '只有主责部门可以申请取消' }
  }

  const oldStatus = workItem.status
  const approver = getProcessFirstApprover(workItem, user)
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.CANCELLING,
      action: ActionType.CANCEL,
      cancelReason,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.CANCEL,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
    },
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'cancel',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '申请取消',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'cancel',
    module: 'workflow',
    description: `申请取消: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}

export async function decomposeTodo(
  workItemId: number,
  user: UserSession,
  nodes: any[],
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await findWorkItemById(workItemId)
  if (!workItem) {
    return { success: false, error: '事项不存在' }
  }

  if (workItem.type !== WorkItemType.TODO) {
    return { success: false, error: '只有待办事项可以分解' }
  }

  if (workItem.status !== WorkItemStatus.PENDING_DECOMPOSE) {
    return { success: false, error: '只有待分解事项可以提交分解方案' }
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权分解该待办事项' }
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return { success: false, error: '只有主责部门可以分解该待办事项' }
  }

  const oldStatus = workItem.status
  const approver = getProposalFirstApprover(workItem, user)
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      nodes: nodes as Prisma.InputJsonValue,
      status: WorkItemStatus.PROPOSING,
      action: ActionType.TODO_DECOMPOSE,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.PROPOSE,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
      firstSubmitterId: workItem.firstSubmitterId ?? user.userId,
      rejectReason: null,
      rejectedFromStatus: null,
    },
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'decompose',
    operatorId: user.userId,
    operatorRole: user.role,
    statusBefore: oldStatus,
    statusAfter: updated.status,
    comment: comment || '提交待办分解方案',
  })
  await createOperationLog({
    userId: user.userId,
    userName: user.userName,
    userRole: user.role,
    operationType: 'decompose',
    module: 'workflow',
    description: `分解待办: ${workItem.title}`,
    targetId: workItemId,
  })

  return { success: true, workItem: updated }
}

export async function getWorkflowRecords(workItemId: number) {
  const records = await findWorkflowRecordsByWorkItemId(workItemId)

  return records.map((record) => ({
    id: record.id,
    action: record.actionType,
    initiatorId: record.initiatorId,
    initiatorName: record.initiator?.name || '',
    initiatorRole: record.initiator?.role || record.approvalRole,
    previousStatus: record.statusBefore,
    newStatus: record.statusAfter,
    comment: record.comment,
    createdAt: record.createdAt,
  }))
}
