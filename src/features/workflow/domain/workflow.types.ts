import type { Role } from '@prisma/client'

export interface UserSession {
  userId: number
  userName: string
  role: Role
  departmentId: number
}

export interface WorkflowResult {
  success: boolean
  workItem?: any
  error?: string
}

export interface ApproverAssignment {
  currentApproverId: number | null
  currentApproverRole: Role | null
}
