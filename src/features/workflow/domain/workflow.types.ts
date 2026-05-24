import type { Role } from '@prisma/client'

export interface ApproverAssignment {
  currentApproverId: number | null
  currentApproverRole: Role | null
}
