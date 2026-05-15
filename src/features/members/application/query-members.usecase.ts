import { prisma } from '@/shared/db/prisma'

export interface QueryMembersInput {
  departmentId: number
  isLeader?: boolean
  includeInactive?: boolean
}

export async function queryMembersUseCase(input: QueryMembersInput) {
  const where: Record<string, unknown> = {
    departmentId: input.departmentId,
  }

  if (!input.includeInactive) {
    where.isActive = true
  }

  if (input.isLeader !== undefined) {
    where.isLeader = input.isLeader
  }

  const members = await prisma.member.findMany({
    where,
    include: {
      user: { select: { id: true, username: true, name: true, isActive: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })

  return members.map((m) => ({
    id: m.id,
    name: m.name,
    departmentId: m.departmentId,
    departmentName: m.department.name,
    phone: m.phone,
    isLeader: m.isLeader,
    sortOrder: m.sortOrder,
    isActive: m.isActive,
    userId: m.userId,
    user: m.user
      ? { id: m.user.id, username: m.user.username, name: m.user.name, isActive: m.user.isActive }
      : null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }))
}
