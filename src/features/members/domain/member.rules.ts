import { findMembersByIds } from '@/features/members/infrastructure/member.repository'

export interface MemberAssignment {
  memberId: number
  role: 'leader' | 'person'
  departmentId: number
}

export interface MemberValidationError {
  kind: 'not_found' | 'inactive' | 'wrong_department' | 'not_leader' | 'not_person'
  memberId: number
  memberName?: string
  message: string
}

export async function validateMemberAssignments(
  assignments: MemberAssignment[],
): Promise<MemberValidationError[]> {
  if (assignments.length === 0) return []

  const memberIds = assignments.map((a) => a.memberId)
  const members = await findMembersByIds(memberIds)
  const memberMap = new Map(members.map((m) => [m.id, m]))
  const errors: MemberValidationError[] = []

  for (const a of assignments) {
    const member = memberMap.get(a.memberId)

    if (!member) {
      errors.push({ kind: 'not_found', memberId: a.memberId, message: `人员 ID ${a.memberId} 不存在` })
      continue
    }

    if (!member.isActive) {
      errors.push({ kind: 'inactive', memberId: a.memberId, memberName: member.name, message: `人员 "${member.name}" 已停用` })
    }

    if (member.departmentId !== a.departmentId) {
      errors.push({ kind: 'wrong_department', memberId: a.memberId, memberName: member.name, message: `人员 "${member.name}" 不属于所选部门` })
    }

    if (a.role === 'leader' && !member.isLeader) {
      errors.push({ kind: 'not_leader', memberId: a.memberId, memberName: member.name, message: `"${member.name}" 不是部门领导` })
    }
    if (a.role === 'person' && member.isLeader) {
      errors.push({ kind: 'not_person', memberId: a.memberId, memberName: member.name, message: `"${member.name}" 是部门领导，不能选为责任人` })
    }
  }

  return errors
}
