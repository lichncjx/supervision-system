import type { Prisma } from '@prisma/client'
import { toMemberDto } from '@/features/members/application/member.dto'
import { findMembersForApi } from '@/features/members/infrastructure/member.repository'
import type { MemberDto } from '@/features/members/application/member.dto'

export interface QueryMembersInput {
  departmentId?: number
  isLeader?: boolean
  includeInactive?: boolean
}

export async function queryMembersUseCase(
  input: QueryMembersInput
): Promise<MemberDto[]> {
  const where: Prisma.MemberWhereInput = {}

  if (input.departmentId !== undefined) {
    where.departmentId = input.departmentId
  }

  if (!input.includeInactive) {
    where.isActive = true
  }

  if (input.isLeader !== undefined) {
    where.isLeader = input.isLeader
  }

  const members = await findMembersForApi(where)
  return members.map(toMemberDto)
}
