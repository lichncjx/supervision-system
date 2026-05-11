import type { Prisma } from '@prisma/client'

export interface QueryWorksParams {
  type: string | null
  status: string | null
  departmentId: string | null
  keyword: string | null
}

export type StatusFilter =
  | { kind: 'where'; where: Prisma.WorkItemWhereInput }
  | {
      kind: 'post'
      where: Prisma.WorkItemWhereInput
      postFilter: 'handling' | 'overdue' | 'expiring'
    }
  | { kind: 'invalid' }

export interface QueryWorksInput {
  currentUser: {
    id: number
    role: string
    departmentId: number
  }
  params: QueryWorksParams
}

export interface WorkListItemDto {
  id: number
  title: string
  type: string
  status: string
  departmentId: number | null
  cooperators: unknown
  departmentName: string
  creatorId: number | null
  creatorName: string
  creatorRole: string
  workItem: string | null
  workNode: string | null
  businessCategory: string | null
  completeTime: string | null
  completeForm: string | null
  isInnovation: boolean | null
  responsibleLeader: string | null
  responsiblePerson: string | null
  proposedLeader: string | null
  proposedLeaderId: number | null
  proposedScene: string | null
  formedTime: string | null
  workPlan: string | null
  planCompleteTime: string | null
  progress: string | null
  action: string | null
  approvalLeaderId: number | null
  currentApproverId: number | null
  currentApproverRole: string | null
  firstSubmitterId: number | null
  rejectReason: string | null
  rejectedFromStatus: string | null
  beforeApprovalStatus: string | null
  approvalType: string | null
  nodes: unknown
  adjustHistory: unknown
  createdAt: string
  updatedAt: string
}
