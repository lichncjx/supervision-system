import { prisma } from '@/shared/db/prisma'

export async function findWorksForCompletionRate(departmentId: number, assessmentYear: number) {
  return prisma.workItem.findMany({
    where: { departmentId, assessmentYear },
  })
}

export function createCompletionRateLog(params: {
  userId: number
  userName: string
  userRole: string
}) {
  prisma.operationLog
    .create({
      data: {
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole as import('@prisma/client').Role,
        action: 'export',
        module: 'excel',
        targetType: 'completion_rate',
        targetId: 0,
        description: '导出完成率统计',
      },
    })
    .catch((logError: unknown) => {
      console.error('Failed to write operation log:', logError)
    })
}
