import { Prisma } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

export interface OperationLogListQuery {
  page: number
  pageSize: number
  action?: string
  module?: string
  userId?: number
  targetType?: string
  targetId?: number
  startDate?: Date
  endDate?: Date
  keyword?: string
}

function buildOperationLogWhere(
  query: OperationLogListQuery,
): Prisma.OperationLogWhereInput {
  const where: Prisma.OperationLogWhereInput = {}

  if (query.action) where.action = query.action
  if (query.module) where.module = query.module
  if (query.userId !== undefined) where.userId = query.userId
  if (query.targetType) where.targetType = query.targetType
  if (query.targetId !== undefined) where.targetId = query.targetId

  if (query.startDate || query.endDate) {
    const createdAt: Prisma.DateTimeFilter = {}
    if (query.startDate) createdAt.gte = query.startDate
    if (query.endDate) createdAt.lte = query.endDate
    where.createdAt = createdAt
  }

  if (query.keyword) {
    where.OR = [
      { description: { contains: query.keyword } },
      { userName: { contains: query.keyword } },
    ]
  }

  return where
}

export async function findOperationLogs(query: OperationLogListQuery) {
  const where = buildOperationLogWhere(query)

  const [items, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.operationLog.count({ where }),
  ])

  return { items, total }
}
