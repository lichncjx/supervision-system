import { Prisma, Role } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'

async function findCooperatorWorkItemIds(departmentId: number): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM work_items
    WHERE cooperators @> ${JSON.stringify([{ departmentId }])}::jsonb
  `
  return rows.map((r) => r.id)
}

function roleIs(role: string, ...targets: Role[]): boolean {
  return targets.includes(role.toUpperCase() as Role)
}

export async function buildWorkVisibilityWhere(
  user: { id: number; role: string; departmentId: number },
  includeCooperators = true,
): Promise<Prisma.WorkItemWhereInput> {
  if (roleIs(user.role, Role.ADMIN, Role.SUPERVISOR)) {
    return {}
  }

  if (roleIs(user.role, Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER)) {
    const base: Prisma.WorkItemWhereInput = { departmentId: user.departmentId }
    if (includeCooperators) {
      const cooperatorWorkIds = await findCooperatorWorkItemIds(user.departmentId)
      if (cooperatorWorkIds.length > 0) {
        return { OR: [base, { id: { in: cooperatorWorkIds } }] }
      }
    }
    return base
  }

  if (roleIs(user.role, Role.VICE_PRESIDENT, Role.PRESIDENT)) {
    return {
      OR: [
        { proposedLeaderId: user.id },
        { approvalLeaderId: user.id },
        { currentApproverId: user.id },
      ],
    }
  }

  return { id: -1 }
}
