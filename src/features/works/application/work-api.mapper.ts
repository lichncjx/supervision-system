import { formatDate } from '@/shared/utils/date'
import {
  processAdjustHistory,
  processNodesForDisplay,
} from '@/features/works/application/work-display.utils'
import type { AttachmentApiDto } from '@/features/attachments/shared/attachment-api.types'
import type { WorkApiDto } from '@/features/works/shared/work-api.types'

const TYPE_LABEL: Record<string, string> = {
  PRIORITY: '重点',
  MAIN: '主要',
  TODO: '待办',
}

interface WorkApiSource {
  id: number
  title: string
  type: string
  status: string
  departmentId: number | null
  department?: { name?: string | null } | null
  cooperators?: unknown
  creatorId?: number | null
  creator?: { name?: string | null; role?: string | null } | null
  firstSubmitterId?: number | null
  firstSubmitter?: { name?: string | null } | null
  workItem?: string | null
  workNode?: string | null
  businessCategory?: string | null
  completeTime?: Date | null
  completeForm?: string | null
  isInnovation?: boolean | null
  responsibleLeader?: string | null
  responsiblePerson?: string | null
  responsibleLeaderMemberId?: number | null
  responsiblePersonMemberId?: number | null
  proposedLeader?: { name?: string | null } | null
  proposedLeaderId?: number | null
  proposedScene?: string | null
  formedTime?: Date | null
  workPlan?: string | null
  planCompleteTime?: Date | null
  progress?: string | null
  action?: string | null
  approvalLeaderId?: number | null
  currentApproverId?: number | null
  currentApproverRole?: string | null
  rejectReason?: string | null
  rejectedFromStatus?: string | null
  beforeApprovalStatus?: string | null
  approvalType?: string | null
  nodes?: unknown
  adjustHistory?: unknown
  attachments?: Array<{
    id: number
    fileName: string
    fileSize: number | null
    fileType: string | null
    category: string | null
    uploadedAt: Date
    userId: number
    user: { name: string }
  }>
  createdAt: Date
  updatedAt: Date
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toWorkAttachments(
  attachments: WorkApiSource['attachments'],
): AttachmentApiDto[] | undefined {
  return attachments?.map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize ?? 0,
    fileType: attachment.fileType ?? '',
    category: attachment.category ?? '',
    uploadedAt: attachment.uploadedAt.toISOString(),
    userId: attachment.userId,
    userName: attachment.user.name,
  }))
}

export function toWorkApiDto(work: WorkApiSource): WorkApiDto {
  return {
    id: work.id,
    title: work.title,
    type: TYPE_LABEL[work.type] || work.type,
    status: work.status,
    departmentId: work.departmentId,
    cooperators: work.cooperators,
    departmentName: work.department?.name || '-',
    creatorId: work.creatorId,
    creatorName: work.creator?.name || '-',
    creatorRole: work.creator?.role || '-',
    firstSubmitterId: work.firstSubmitterId,
    firstSubmitterName: work.firstSubmitter?.name || null,
    workItem: work.workItem,
    workNode: work.workNode,
    businessCategory: work.businessCategory,
    completeTime: formatDate(work.completeTime),
    completeForm: work.completeForm,
    isInnovation: work.isInnovation,
    responsibleLeader: work.responsibleLeader,
    responsiblePerson: work.responsiblePerson,
    responsibleLeaderMemberId: work.responsibleLeaderMemberId,
    responsiblePersonMemberId: work.responsiblePersonMemberId,
    proposedLeader: work.proposedLeader?.name || null,
    proposedLeaderId: work.proposedLeaderId,
    proposedScene: work.proposedScene,
    formedTime: formatDate(work.formedTime),
    workPlan: work.workPlan,
    planCompleteTime: formatDate(work.planCompleteTime),
    progress: work.progress,
    action: work.action,
    approvalLeaderId: work.approvalLeaderId,
    currentApproverId: work.currentApproverId,
    currentApproverRole: work.currentApproverRole,
    rejectReason: work.rejectReason,
    rejectedFromStatus: work.rejectedFromStatus,
    beforeApprovalStatus: work.beforeApprovalStatus,
    approvalType: work.approvalType,
    nodes: processNodesForDisplay(parseJsonField(work.nodes, [])),
    adjustHistory: processAdjustHistory(parseJsonField(work.adjustHistory, [])),
    attachments: toWorkAttachments(work.attachments),
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  }
}
