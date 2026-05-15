import { prisma } from '@/shared/db/prisma'
import { isGlobalViewRole } from '@/features/users/domain/role.rules'

export async function getDepartmentIdsForUser(
  user: { id: number; role: string; departmentId: number },
): Promise<number[]> {
  if (isGlobalViewRole(user.role)) {
    const departments = await findBusinessDepartments()
    return departments.map((d) => d.id)
  }
  return [user.departmentId]
}

export async function findDepartmentById(id: number) {
  return prisma.department.findUnique({ where: { id } })
}

export async function findDepartmentByIdForDashboard(id: number) {
  return prisma.department.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
}

export async function findBusinessDepartments() {
  return prisma.department.findMany({
    where: { isBusiness: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function findDepartmentsByIds(ids: number[]) {
  return prisma.department.findMany({
    where: { id: { in: ids }, isBusiness: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function findDepartmentsForImport() {
  return prisma.department.findMany({
    where: { isBusiness: true },
    select: { id: true, name: true, code: true },
  })
}
