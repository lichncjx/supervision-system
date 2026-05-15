import { Role } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

export interface DepartmentInfo {
  id: number; name: string; code: string | null
}

export interface CompanyLeaderInfo {
  id: number; name: string
}

export async function createImportedWorkItems(params: {
  workItems: any[]
  logUserId: number
  logUserName: string
  logUserRole: string
  typeLabel: string
}) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.workItem.createMany({
      data: params.workItems,
    })

    await tx.operationLog.create({
      data: {
        userId: params.logUserId,
        userName: params.logUserName,
        userRole: params.logUserRole as Role,
        action: 'import',
        module: 'excel',
        targetType: 'workItem',
        targetId: 0,
        description: `导入${params.workItems.length}条${params.typeLabel}事项`,
      },
    })

    return created
  })
}
