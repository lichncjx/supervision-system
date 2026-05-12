import { Prisma, Role, WorkItemStatus } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

export type WorkflowWorkItem = Prisma.WorkItemGetPayload<object>

export async function findWorkItemById(workItemId: number) {
  return prisma.workItem.findUnique({
    where: { id: workItemId },
  })
}

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

export async function findPresidentUser() {
  return prisma.user.findFirst({
    where: {
      role: Role.PRESIDENT,
      isActive: true,
    },
    orderBy: { id: 'asc' },
    select: { id: true },
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

export async function updateWorkItemForWorkflow(
  workItemId: number,
  data: Record<string, unknown>,
) {
  return prisma.workItem.update({
    where: { id: workItemId },
    data: data as Prisma.WorkItemUpdateInput,
  })
}
