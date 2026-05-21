import type { Role } from '@prisma/client'

export interface WorkflowResult {
  success: boolean
  workItem?: unknown
  error?: string
}

export interface ApproverAssignment {
  currentApproverId: number | null
  currentApproverRole: Role | null
}
