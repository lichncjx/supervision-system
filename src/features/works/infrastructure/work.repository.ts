import { Prisma, Role } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

const WORK_LIST_INCLUDE = {
  department: true,
  creator: { select: { name: true, role: true } },
  proposedLeader: { select: { id: true, name: true } },
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
  proposedLeader: { select: { id: true, name: true } },
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

export async function findDepartmentById(id: number) {
  return prisma.department.findUnique({ where: { id } })
}

export async function findWorkForUpdateById(id: number) {
  return prisma.workItem.findUnique({ where: { id } })
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

export async function deleteWorkItem(id: number) {
  await prisma.workItem.delete({ where: { id } })
}

export async function createWorkDeleteOperationLog(params: {
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
      action: 'delete',
      module: 'works',
      targetId: params.workId,
      targetType: 'work_item',
      description: `删除${typeLabel}工作：${params.workTitle}`,
    },
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
