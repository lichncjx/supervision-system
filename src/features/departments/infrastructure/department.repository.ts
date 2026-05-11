import { prisma } from '@/shared/db/prisma'
import { isGlobalViewRole } from '@/features/users/domain/role.rules'

export async function getDepartmentIdsForUser(
  user: { id: number; role: string; departmentId: number },
): Promise<number[]> {
  if (isGlobalViewRole(user.role)) {
    const departments = await prisma.department.findMany({
      where: { isBusiness: true },
      select: { id: true },
    })
    return departments.map((department) => department.id)
  }

  return [user.departmentId]
}
