import type { AttachmentDto } from '@/features/attachments/application/attachment.dto';

export type WorkPersonDto = string | { name?: unknown; } | null

export interface WorkDto {
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
    proposedLeader?: WorkPersonDto
    proposedLeaderId?: number | null
    proposedLeaderRole?: string | null
    approvalLeader?: WorkPersonDto
    approvalLeaderId?: number | null
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
    adjustReason?: string | null
    cancelReason?: string | null
    rejectedFrom?: string | null
    rejectedFromStatus?: string | null
    beforeApprovalStatus?: string | null
    approvalType?: string | null
    nodes?: unknown
    adjustHistory?: unknown
    pendingAdjustment?: unknown
    pendingAdjustmentReason?: string | null
    pendingAdjustmentBeforeSnapshot?: unknown
    pendingAdjustmentFromTime?: string | null
    pendingAdjustmentToTime?: string | null
    attachments?: AttachmentDto[]
    createdAt?: string
    updatedAt: string
}

