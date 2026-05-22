export interface MemberUserApiDto {
  id: number
  username: string
  name: string
  isActive: boolean
}

export interface MemberApiDto {
  id: number
  name: string
  departmentId: number
  departmentName: string
  phone: string | null
  isLeader: boolean
  sortOrder: number
  isActive: boolean
  userId: number | null
  user: MemberUserApiDto | null
  createdAt: string
  updatedAt: string
}

export interface MemberOptionApiDto {
  id: number
  name: string
  departmentId: number
  departmentName: string
  isLeader: boolean
}

export type MemberListResponse = MemberApiDto[]
export type MemberOptionListResponse = MemberOptionApiDto[]
export type QueryMembersResponse = MemberListResponse | MemberOptionListResponse

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

export interface MemberMutationResponse extends MemberApiDto {
  warnings?: string[]
}

export interface MemberApiErrorDto {
  error?: string
}
