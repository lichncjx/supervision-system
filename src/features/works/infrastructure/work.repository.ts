import { Prisma } from '@prisma/client'
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
