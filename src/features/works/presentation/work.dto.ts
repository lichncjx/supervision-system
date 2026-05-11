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

export interface GetWorkDetailInput {
  currentUser: {
    id: number
    role: string
    departmentId: number
  }
  workId: number
}

export interface WorkAttachmentDto {
  id: number
  fileName: string
  fileSize: number | null
  fileType: string | null
  category: string | null
  uploadedAt: string
  userId: number
  userName: string
}

export interface WorkDetailDto {
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
  attachments: WorkAttachmentDto[]
  createdAt: string
  updatedAt: string
}

export interface CreateWorkBody {
  type: string
  departmentId: number
  title?: string
  workItem?: string
  workNode?: string
  businessCategory?: string
  completeTime?: string
  completeForm?: string
  isInnovation?: boolean
  responsibleLeader?: string
  responsiblePerson?: string
  proposedLeaderId?: number
  proposedScene?: string
  formedTime?: string
  cooperators?: unknown
  workPlan?: string
  planCompleteTime?: string
  progress?: string
  approvalLeaderId?: number
  nodes?: unknown
}

export interface CreateWorkInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  body: CreateWorkBody
}

export interface CreateWorkResponseDto {
  id: number
  title: string
  type: string
  departmentId: number | null
  cooperators: unknown
  departmentName: string
  proposedLeader: string | null
  proposedLeaderId: number | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface UpdateWorkBody {
  title?: string
  workItem?: string
  workNode?: string
  businessCategory?: string
  completeTime?: string
  completeForm?: string
  isInnovation?: boolean
  responsibleLeader?: string
  responsiblePerson?: string
  proposedLeaderId?: number
  proposedScene?: string
  formedTime?: string
  cooperators?: unknown
  workPlan?: string
  planCompleteTime?: string
  progress?: string
  approvalLeaderId?: number
  nodes?: unknown
}

export interface UpdateWorkInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  workId: number
  body: UpdateWorkBody
}

export interface DeleteWorkInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  workId: number
}

export interface DeleteWorkResponseDto {
  success: true
  message: string
}

export interface UpdateWorkResponseDto {
  id: number
  title: string
  type: string
  departmentId: number | null
  departmentName: string
  status: string
  updatedAt: string
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
