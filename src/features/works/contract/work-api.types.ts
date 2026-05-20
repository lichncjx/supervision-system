import type { AttachmentApiDto } from '@/features/attachments/contract/attachment-api.types'

export type WorkPersonApiDto = string | { name?: unknown } | null

export interface WorkApiDto {
  id: number
  title: string
  type: string
  status: string
  departmentId: number | null
  departmentName?: string | null
  cooperators?: unknown
  creatorId?: number | null
  creatorName?: string | null
  creatorRole?: string | null
  firstSubmitterId?: number | null
  firstSubmitterName?: string | null
  proposedLeader?: WorkPersonApiDto
  proposedLeaderId?: number | null
  proposedLeaderRole?: string | null
  approvalLeaderId?: number | null
  approvalLeader?: WorkPersonApiDto
  approvalLeaderRole?: string | null
  currentApproverId?: number | null
  currentApproverRole?: string | null
  responsibleLeader?: string | null
  responsiblePerson?: string | null
  responsibleLeaderMemberId?: number | null
  responsiblePersonMemberId?: number | null
  workItem?: string | null
  workNode?: string | null
  businessCategory?: string | null
  completeTime?: string | null
  completeForm?: string | null
  isInnovation?: boolean | null
  proposedScene?: string | null
  formedTime?: string | null
  workPlan?: string | null
  planCompleteTime?: string | null
  progress?: string | null
  action?: string | null
  rejectReason?: string | null
  rejectedAt?: string | null
  rejectedFrom?: string | null
  rejectedFromStatus?: string | null
  beforeApprovalStatus?: string | null
  approvalType?: string | null
  nodes?: unknown
  adjustHistory?: unknown
  attachments?: AttachmentApiDto[]
  createdAt?: string
  updatedAt: string
}

export type WorkListResponse = WorkApiDto[]
export type WorkDetailResponse = WorkApiDto
export type CreateWorkResponse = WorkApiDto
export type UpdateWorkResponse = WorkApiDto

export interface CreateWorkRequest {
  type: string
  departmentId: number | null
  title?: string | null
  workItem?: string | null
  workNode?: string | null
  businessCategory?: string | null
  completeForm?: string | null
  isInnovation?: boolean | null
  responsibleLeader?: string | null
  responsiblePerson?: string | null
  responsibleLeaderMemberId?: number | null
  responsiblePersonMemberId?: number | null
  proposedLeader?: string | null
  proposedLeaderId?: number | null
  proposedScene?: string | null
  formedTime?: string | null
  cooperators?: unknown
  workPlan?: string | null
  planCompleteTime?: string | null
  progress?: string | null
  approvalLeaderId?: number | null
  nodes?: unknown
}

export interface UpdateWorkRequest {
  title?: string | null
  departmentId?: number
  workItem?: string | null
  workNode?: string | null
  businessCategory?: string | null
  completeForm?: string | null
  isInnovation?: boolean | null
  responsibleLeader?: string | null
  responsiblePerson?: string | null
  responsibleLeaderMemberId?: number | null
  responsiblePersonMemberId?: number | null
  proposedLeader?: string | null
  proposedLeaderId?: number | null
  proposedScene?: string | null
  formedTime?: string | null
  cooperators?: unknown
  workPlan?: string | null
  planCompleteTime?: string | null
  progress?: string | null
  approvalLeaderId?: number | null
  nodes?: unknown
}

export interface WorkApiErrorDto {
  error?: string
}
