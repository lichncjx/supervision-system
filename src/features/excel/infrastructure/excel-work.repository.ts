import { Prisma } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

const EXPORT_INCLUDE = {
  department: { select: { id: true, name: true, code: true } },
  creator: { select: { name: true } },
  proposedLeader: { select: { name: true } },
  approvalLeader: { select: { name: true } },
} as const

export type ExportWorkRow = Prisma.WorkItemGetPayload<{
  include: typeof EXPORT_INCLUDE
}>

export async function findWorksForExport(
  where: Prisma.WorkItemWhereInput,
): Promise<ExportWorkRow[]> {
  return prisma.workItem.findMany({
    where,
    include: EXPORT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
}

export function createExportOperationLog(params: {
  userId: number
  userName: string
  userRole: string
  visibleItemCount: number
}) {
  prisma.operationLog
    .create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole as import('@prisma/client').Role,
        action: 'export',
        module: 'excel',
        targetType: 'workItem',
        targetId: 0,
        description: `导出事项数据，共 ${params.visibleItemCount} 条`,
      },
    })
    .catch((logError: unknown) => {
      console.error('Failed to write operation log:', logError)
    })
}
