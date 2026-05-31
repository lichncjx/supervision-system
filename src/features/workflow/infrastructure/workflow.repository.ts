import {
  Prisma,
  Role,
  WorkAdjustmentRequestStatus,
  WorkItemStatus,
} from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

export async function findPresident() {
  return prisma.user.findFirst({
    where: { role: Role.PRESIDENT, isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
}

export async function findCompanyLeaderById(userId: number) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
      isActive: true,
    },
    select: { id: true, role: true },
  })
}

export type WorkflowWorkItem = Prisma.WorkItemGetPayload<object>

export async function createWorkflowRecord(params: {
  workItemId: number
  actionType: string
  operatorId: number
  operatorRole: Role
  statusBefore: WorkItemStatus
  statusAfter: WorkItemStatus
  comment?: string
}) {
  return prisma.workflowRecord.create({
    data: {
      workItemId: params.workItemId,
      actionType: params.actionType,
      initiatorId: params.operatorId,
      approvalRole: params.operatorRole,
      statusBefore: params.statusBefore,
      statusAfter: params.statusAfter,
      comment: params.comment,
    },
  })
}

export async function createOperationLog(params: {
  userId: number
  userName: string
  userRole: Role
  operationType: string
  module: string
  description: string
  targetId?: number
}) {
  return prisma.operationLog.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.operationType,
      module: params.module,
      description: params.description,
      targetId: params.targetId,
      targetType: 'workItem',
    },
  })
}

export async function findWorkflowRecordsByWorkItemId(
  workItemId: number,
) {
  return prisma.workflowRecord.findMany({
    where: { workItemId },
    include: {
      initiator: {
        select: {
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function findAdjustment(workItemId: number) {
  return prisma.workAdjustmentRequest.findFirst({
    where: {
      workItemId,
      status: WorkAdjustmentRequestStatus.PENDING,
    },
    orderBy: { requestedAt: 'desc' },
  })
}

export async function createAdjustment(params: {
  workItemId: number
  reason: string
  patch: Prisma.InputJsonValue
  beforeSnapshot: Prisma.InputJsonValue
  requestedById: number
}) {
  return prisma.workAdjustmentRequest.create({
    data: {
      workItemId: params.workItemId,
      reason: params.reason,
      patch: params.patch,
      beforeSnapshot: params.beforeSnapshot,
      requestedById: params.requestedById,
    },
  })
}

export async function approveAdjustment(params: {
  requestId: number
  approvedById: number
}) {
  return prisma.workAdjustmentRequest.update({
    where: { id: params.requestId },
    data: {
      status: WorkAdjustmentRequestStatus.APPROVED,
      approvedById: params.approvedById,
      approvedAt: new Date(),
    },
  })
}

export async function rejectAdjustment(params: {
  workItemId: number
  rejectedById: number
  rejectReason: string
}) {
  return prisma.workAdjustmentRequest.updateMany({
    where: {
      workItemId: params.workItemId,
      status: WorkAdjustmentRequestStatus.PENDING,
    },
    data: {
      status: WorkAdjustmentRequestStatus.REJECTED,
      rejectedById: params.rejectedById,
      rejectedAt: new Date(),
      rejectReason: params.rejectReason,
    },
  })
}

