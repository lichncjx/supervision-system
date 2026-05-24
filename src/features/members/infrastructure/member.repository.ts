import { prisma } from '@/shared/db/prisma'
import type { Prisma } from '@prisma/client'

const MEMBER_WITH_USER_DEPARTMENT = {
  user: { select: { id: true, username: true, name: true, isActive: true } },
  department: { select: { id: true, name: true } },
} as const

export type MemberWithRelations = Prisma.MemberGetPayload<{
  include: typeof MEMBER_WITH_USER_DEPARTMENT
}>

export async function findMembersByIds(ids: number[]) {
  return prisma.member.findMany({
    where: { id: { in: ids } },
  })
}

export async function findMembersForApi(
  where: Prisma.MemberWhereInput = {},
): Promise<MemberWithRelations[]> {
  return prisma.member.findMany({
    where,
    include: MEMBER_WITH_USER_DEPARTMENT,
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
}

export async function createMemberWithRelations(
  data: Prisma.MemberCreateInput,
): Promise<MemberWithRelations> {
  return prisma.member.create({
    data,
    include: MEMBER_WITH_USER_DEPARTMENT,
  })
}

export async function updateMemberWithRelations(
  where: Prisma.MemberWhereUniqueInput,
  data: Prisma.MemberUpdateInput,
): Promise<MemberWithRelations> {
  return prisma.member.update({
    where,
    data,
    include: MEMBER_WITH_USER_DEPARTMENT,
  })
}
