import { prisma } from '@/shared/db/prisma'
import { Role } from '@prisma/client'

export async function findCompanyLeaders() {
  return prisma.user.findMany({
    where: {
      role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
      isActive: true,
    },
    select: { id: true, name: true },
  })
}

export async function findPresident() {
  return prisma.user.findFirst({
    where: { role: Role.PRESIDENT, isActive: true },
    orderBy: { id: 'asc' },
    select: { id: true },
  })
}
