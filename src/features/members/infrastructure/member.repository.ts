import { prisma } from '@/shared/db/prisma'

export async function findMembersByIds(ids: number[]) {
  return prisma.member.findMany({
    where: { id: { in: ids } },
  })
}
