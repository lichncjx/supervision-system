import { prisma } from '@/shared/db/prisma'

export interface OperationLogFilters {
  action?: string
  module?: string
  userId?: number
  targetType?: string
  targetId?: number
  startDate?: string
  endDate?: string
  keyword?: string
}

export async function findOperationLogs(
  filters: OperationLogFilters,
  skip: number,
  take: number,
) {
  const where: Record<string, unknown> = {}

  if (filters.action) where.action = filters.action
  if (filters.module) where.module = filters.module
  if (filters.userId) where.userId = filters.userId
  if (filters.targetType) where.targetType = filters.targetType
  if (filters.targetId) where.targetId = filters.targetId

  if (filters.startDate || filters.endDate) {
    const createdAt: Record<string, Date> = {}
    if (filters.startDate) createdAt.gte = new Date(filters.startDate)
    if (filters.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      createdAt.lte = end
    }
    where.createdAt = createdAt
  }

  if (filters.keyword) {
    where.OR = [
      { description: { contains: filters.keyword } },
      { userName: { contains: filters.keyword } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.operationLog.count({ where }),
  ])

  return { items, total }
}
