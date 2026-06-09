import { formatDate } from '@/shared/utils/date'
import {
  processAdjustHistory,
  processNodesForDisplay,
} from '@/features/works/application/work-display.utils'
import type { AttachmentDto } from '@/features/attachments/application/attachment.dto'
import type { WorkDto } from './work.dto'

const TYPE_LABEL: Record<string, string> = {
  PRIORITY: '重点',
  MAIN: '主要',
  TODO: '待办',
}

interface WorkSource {
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
  responsibleLeaderUserId?: number | null
  responsiblePersonUserId?: number | null
  responsibleLeaderUser?: { id: number; name: string } | null
  responsiblePersonUser?: { id: number; name: string } | null
  proposedLeader?: { name?: string | null; role?: string | null } | null
  proposedLeaderId?: number | null
  approvalLeader?: { name?: string | null; role?: string | null } | null
  approvalLeaderId?: number | null
  proposedScene?: string | null
  formedTime?: Date | null
  workPlan?: string | null
  planCompleteTime?: Date | null
  progress?: string | null
  action?: string | null
  currentApproverId?: number | null
  currentApproverRole?: string | null
  adjustReason?: string | null
  cancelReason?: string | null
  rejectReason?: string | null
  rejectedFromStatus?: string | null
  beforeApprovalStatus?: string | null
  approvalType?: string | null
  nodes?: unknown
  adjustHistory?: unknown
  adjustmentRequests?: Array<{
    reason: string
    patch: unknown
    beforeSnapshot: unknown
  }>
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
  attachments: WorkSource['attachments'],
): AttachmentDto[] | undefined {
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

function getPendingAdjustment(work: WorkSource) {
  const request = work.adjustmentRequests?.[0]
  if (!request) return null

  const patch = parseJsonField<Record<string, unknown>>(request.patch, {})
  const beforeSnapshot = parseJsonField<Record<string, unknown>>(request.beforeSnapshot, {})

  return {
    patch,
    beforeSnapshot,
    reason: request.reason,
    fromTime: typeof beforeSnapshot.planCompleteTime === 'string'
      ? beforeSnapshot.planCompleteTime
      : null,
    toTime: typeof patch.planCompleteTime === 'string'
      ? patch.planCompleteTime
      : null,
  }
}

export function toWorkDto(work: WorkSource): WorkDto {
  const pendingAdjustment = getPendingAdjustment(work)

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
    responsibleLeaderUserId: work.responsibleLeaderUserId,
    responsiblePersonUserId: work.responsiblePersonUserId,
    proposedLeader: work.proposedLeader?.name || null,
    proposedLeaderId: work.proposedLeaderId,
    proposedLeaderRole: work.proposedLeader?.role || null,
    approvalLeader: work.approvalLeader?.name || null,
    approvalLeaderId: work.approvalLeaderId,
    approvalLeaderRole: work.approvalLeader?.role || null,
    proposedScene: work.proposedScene,
    formedTime: formatDate(work.formedTime),
    workPlan: work.workPlan,
    planCompleteTime: formatDate(work.planCompleteTime),
    progress: work.progress,
    action: work.action,
    currentApproverId: work.currentApproverId,
    currentApproverRole: work.currentApproverRole,
    adjustReason: work.adjustReason,
    cancelReason: work.cancelReason,
    rejectReason: work.rejectReason,
    rejectedFromStatus: work.rejectedFromStatus,
    beforeApprovalStatus: work.beforeApprovalStatus,
    approvalType: work.approvalType,
    nodes: processNodesForDisplay(parseJsonField(work.nodes, [])),
    adjustHistory: processAdjustHistory(parseJsonField(work.adjustHistory, [])),
    pendingAdjustment: pendingAdjustment?.patch,
    pendingAdjustmentReason: pendingAdjustment?.reason,
    pendingAdjustmentBeforeSnapshot: pendingAdjustment?.beforeSnapshot,
    pendingAdjustmentFromTime: pendingAdjustment?.fromTime,
    pendingAdjustmentToTime: pendingAdjustment?.toTime,
    attachments: toWorkAttachments(work.attachments),
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  }
}
