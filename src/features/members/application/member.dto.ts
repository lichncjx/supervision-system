import type { MemberWithRelations } from '@/features/members/infrastructure/member.repository'

export interface MemberUserDto {
  id: number
  username: string
  name: string
  isActive: boolean
}

export interface MemberDto {
  id: number
  name: string
  departmentId: number
  departmentName: string
  phone: string | null
  isLeader: boolean
  sortOrder: number
  isActive: boolean
  userId: number | null
  user: MemberUserDto | null
  createdAt: string
  updatedAt: string
}

export interface MemberMutation extends MemberDto {
  warnings?: string[]
}

export function toMemberResponse(m: MemberWithRelations): MemberDto {
  return {
    id: m.id,
    name: m.name,
    departmentId: m.departmentId,
    departmentName: m.department?.name ?? '',
    phone: m.phone,
    isLeader: m.isLeader,
    sortOrder: m.sortOrder,
    isActive: m.isActive,
    userId: m.userId,
    user: m.user
      ? { id: m.user.id, username: m.user.username, name: m.user.name, isActive: m.user.isActive }
      : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }
}
