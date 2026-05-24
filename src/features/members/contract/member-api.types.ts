import type { MemberDto } from '@/features/members/application/member.dto'

export type MemberOptionDto = Pick<MemberDto, 'id' | 'name' | 'departmentId' | 'departmentName' | 'isLeader'>

export interface CreateMemberRequest {
  name: string
  departmentId: number
  phone?: string | null
  isLeader?: boolean
  sortOrder?: number
  userId?: number | null
  importFromUserId?: number
}

export interface UpdateMemberRequest {
  name?: string
  departmentId?: number
  phone?: string | null
  isLeader?: boolean
  sortOrder?: number
  isActive?: boolean
  userId?: number | null
}
