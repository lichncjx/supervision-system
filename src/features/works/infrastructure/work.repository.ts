import { Prisma, Role, WorkAdjustmentRequestStatus } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'
import { isReturnedDraftWork } from '@/features/works/domain/work-status.rules'

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
    select: {
      id: true,
      status: true,
      creatorId: true,
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
}): Promise<{
  deleted: boolean
  attachments: Array<{ id: number; filePath: string }>
}> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM "work_items" WHERE id = ${params.workId} FOR UPDATE
    `
    const work = await tx.workItem.findUnique({
      where: { id: params.workId },
      include: {
        creator: { select: { name: true } },
        attachments: { select: { id: true, filePath: true } },
        workflowRecords: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { actionType: true },
        },
        _count: {
          select: {
            workflowRecords: true,
            attachments: true,
          },
        },
      },
    })

    if (!work) return { deleted: false, attachments: [] }

    const deleted = await tx.workItem.deleteMany({
      where: {
        id: params.workId,
        status: 'DRAFT',
        ...(params.userRole === Role.ADMIN
          ? {}
          : { creatorId: params.userId }),
      },
    })

    if (deleted.count !== 1) return { deleted: false, attachments: [] }

    const typeLabel =
      work.type === 'PRIORITY'
        ? '重点'
        : work.type === 'MAIN'
          ? '主要'
          : '待办'
    const actorLabel = params.userRole === Role.ADMIN ? '管理员' : '创建人'
    const draftLabel = isReturnedDraftWork(work) ? '退回草稿' : '草稿'
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
          `${actorLabel}删除${typeLabel}${draftLabel}：${work.title}` +
          `（原事项ID：${work.id}，创建人：${work.creator.name}` +
          `（ID：${work.creatorId}），流程记录：${work._count.workflowRecords}，` +
          `附件：${work._count.attachments}）`,
      },
    })

    return {
      deleted: true,
      attachments: work.attachments,
    }
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
