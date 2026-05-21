import { Role } from '@prisma/client'

export interface UserListItem {
  id: number
  username: string
  name: string
  role: Role
  departmentId: number | null
  departmentName: string
  isActive: boolean
  email: string | null
  phone: string | null
  createdAt: Date
  isProtected: boolean
}

export interface LeaderItem {
  id: number
  name: string
  role: Role
  departmentId: number | null
  departmentName: string
}
