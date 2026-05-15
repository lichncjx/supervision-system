import { prisma } from '@/shared/db/prisma'
import { toMemberResponse } from '@/features/members/domain/member.types'

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

  return members.map(toMemberResponse)
}
