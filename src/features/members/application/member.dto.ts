export interface MemberResponse {
  id: number
  name: string
  departmentId: number
  departmentName: string
  phone: string | null
  isLeader: boolean
  sortOrder: number
  isActive: boolean
  userId: number | null
  user: { id: number; username: string; name: string; isActive: boolean } | null
  createdAt: Date
  updatedAt: Date
}

export function toMemberResponse(m: any): MemberResponse {
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
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}
