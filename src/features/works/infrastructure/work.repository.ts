import { Prisma, Role, WorkAdjustmentRequestStatus } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

const WORK_LIST_INCLUDE = {
  department: true,
  creator: { select: { name: true, role: true } },
  proposedLeader: { select: { id: true, name: true, role: true } },
  approvalLeader: { select: { id: true, name: true, role: true } },
  responsibleLeaderUser: { select: { id: true, name: true } },
  responsiblePersonUser: { select: { id: true, name: true } },
  adjustmentRequests: {
    where: { status: WorkAdjustmentRequestStatus.PENDING },
    orderBy: { requestedAt: 'desc' as const },
    take: 1,
  },
} as const

export type WorkListRow = Prisma.WorkItemGetPayload<{
  include: typeof WORK_LIST_INCLUDE
}>

export async function findManyWorks(
  where: Prisma.WorkItemWhereInput,
): Promise<WorkListRow[]> {
  return prisma.workItem.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: WORK_LIST_INCLUDE,
  })
}

const WORK_DETAIL_INCLUDE = {
  department: true,
  creator: { select: { name: true, role: true } },
  firstSubmitter: { select: { name: true } },
  responsibleLeaderUser: { select: { id: true, name: true } },
  responsiblePersonUser: { select: { id: true, name: true } },
  proposedLeader: { select: { id: true, name: true, role: true } },
  approvalLeader: { select: { id: true, name: true, role: true } },
  adjustmentRequests: {
    where: { status: WorkAdjustmentRequestStatus.PENDING },
    orderBy: { requestedAt: 'desc' as const },
    take: 1,
  },
  attachments: {
    include: {
      user: { select: { name: true } },
    },
    orderBy: { uploadedAt: 'desc' as const },
  },
} as const

export type WorkDetailRow = Prisma.WorkItemGetPayload<{
  include: typeof WORK_DETAIL_INCLUDE
}>

export async function findWorkDetailById(
  id: number,
): Promise<WorkDetailRow | null> {
  return prisma.workItem.findUnique({
    where: { id },
    include: WORK_DETAIL_INCLUDE,
  })
}

const WORK_CREATE_INCLUDE = {
  department: true,
  proposedLeader: { select: { id: true, name: true } },
  responsibleLeaderUser: { select: { id: true, name: true } },
  responsiblePersonUser: { select: { id: true, name: true } },
} as const

export type WorkCreateRow = Prisma.WorkItemGetPayload<{
  include: typeof WORK_CREATE_INCLUDE
}>

export async function createWorkItem(
  data: Prisma.WorkItemCreateInput,
): Promise<WorkCreateRow> {
  return prisma.workItem.create({
    data,
    include: WORK_CREATE_INCLUDE,
  })
}

export async function findWorkForUpdateById(id: number) {
  return prisma.workItem.findUnique({ where: { id } })
}

export async function findWorkForDeleteById(id: number) {
  return prisma.workItem.findUnique({
    where: { id },
    include: {
      creator: { select: { name: true } },
      attachments: { select: { filePath: true } },
      _count: {
        select: {
          workflowRecords: true,
          attachments: true,
        },
      },
    },
  })
}

export async function updateWorkItem(
  id: number,
  data: Record<string, unknown>,
) {
  return prisma.workItem.update({
    where: { id },
    data,
    include: { department: true },
  })
}

export async function deleteDraftWorkWithOperationLog(params: {
  userId: number
  userName: string
  userRole: Role
  workId: number
  workType: string
  workTitle: string
  creatorId: number
  creatorName: string
  workflowRecordCount: number
  attachmentCount: number
  isReturnedDraft: boolean
}): Promise<boolean> {
  const typeLabel =
    params.workType === 'PRIORITY'
      ? '重点'
      : params.workType === 'MAIN'
        ? '主要'
        : '待办'

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.workItem.deleteMany({
      where: {
        id: params.workId,
        status: 'DRAFT',
        ...(params.userRole === Role.ADMIN
          ? {}
          : { creatorId: params.userId }),
      },
    })

    if (deleted.count !== 1) return false

    const actorLabel = params.userRole === Role.ADMIN ? '管理员' : '创建人'
    const draftLabel = params.isReturnedDraft ? '退回草稿' : '草稿'
    await tx.operationLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        action: 'delete',
        module: 'works',
        targetId: params.workId,
        targetType: 'work_item',
        description:
          `${actorLabel}删除${typeLabel}${draftLabel}：${params.workTitle}` +
          `（原事项ID：${params.workId}，创建人：${params.creatorName}` +
          `（ID：${params.creatorId}），流程记录：${params.workflowRecordCount}，` +
          `附件：${params.attachmentCount}）`,
      },
    })

    return true
  })
}

export async function createWorkUpdateOperationLog(params: {
  userId: number
  userName: string
  userRole: Role
  workId: number
  workType: string
  workTitle: string
}) {
  const typeLabel =
    params.workType === 'PRIORITY'
      ? '重点'
      : params.workType === 'MAIN'
        ? '主要'
        : '待办'

  await prisma.operationLog.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: 'update',
      module: 'works',
      targetId: params.workId,
      targetType: 'work_item',
      description: `修改${typeLabel}工作：${params.workTitle}`,
    },
  })
}

export async function createWorkOperationLog(params: {
  userId: number
  userName: string
  userRole: Role
  workId: number
  workType: string
  workTitle: string
}) {
  const typeLabel =
    params.workType === 'PRIORITY'
      ? '重点'
      : params.workType === 'MAIN'
        ? '主要'
        : '待办'

  await prisma.operationLog.create({
    data: {
      userId: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: 'create',
      module: 'works',
      targetId: params.workId,
      targetType: 'work_item',
      description: `创建${typeLabel}工作：${params.workTitle}`,
    },
  })
}
