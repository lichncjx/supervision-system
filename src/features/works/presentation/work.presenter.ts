import { formatDate, processNodesForDisplay, processAdjustHistory } from '@/lib/utils'
import type {
  WorkListItemDto,
  WorkDetailDto,
  WorkAttachmentDto,
  CreateWorkResponseDto,
  UpdateWorkResponseDto,
} from './work.dto'
import type {
  WorkListRow,
  WorkDetailRow,
  WorkCreateRow,
} from '@/features/works/infrastructure/work.repository'

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const TYPE_LABEL: Record<string, string> = {
  PRIORITY: '重点',
  MAIN: '主要',
  TODO: '待办',
}

export function toWorkListItem(work: WorkListRow): WorkListItemDto {
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
    workItem: work.workItem,
    workNode: work.workNode,
    businessCategory: work.businessCategory,
    completeTime: formatDate(work.completeTime),
    completeForm: work.completeForm,
    isInnovation: work.isInnovation,
    responsibleLeader: work.responsibleLeader,
    responsiblePerson: work.responsiblePerson,
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
    firstSubmitterId: work.firstSubmitterId,
    rejectReason: work.rejectReason,
    rejectedFromStatus: work.rejectedFromStatus,
    beforeApprovalStatus: work.beforeApprovalStatus,
    approvalType: work.approvalType,
    nodes: processNodesForDisplay(parseJsonField(work.nodes, [])),
    adjustHistory: processAdjustHistory(
      parseJsonField(work.adjustHistory, []),
    ),
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  }
}

export function toUpdateWorkResponse(work: {
  id: number
  title: string
  type: string
  departmentId: number | null
  department?: { name: string } | null
  status: string
  updatedAt: Date
}): UpdateWorkResponseDto {
  return {
    id: work.id,
    title: work.title,
    type:
      work.type === 'PRIORITY'
        ? '重点'
        : work.type === 'MAIN'
          ? '主要'
          : '待办',
    departmentId: work.departmentId,
    departmentName: work.department?.name || '-',
    status: work.status,
    updatedAt: work.updatedAt.toISOString(),
  }
}

export function toCreateWorkResponse(
  work: WorkCreateRow,
): CreateWorkResponseDto {
  return {
    id: work.id,
    title: work.title,
    type:
      work.type === 'PRIORITY'
        ? '重点'
        : work.type === 'MAIN'
          ? '主要'
          : '待办',
    departmentId: work.departmentId,
    cooperators: work.cooperators,
    departmentName: work.department?.name || '-',
    proposedLeader: work.proposedLeader?.name || null,
    proposedLeaderId: work.proposedLeaderId,
    status: work.status,
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  }
}

export function toWorkListItems(works: WorkListRow[]): WorkListItemDto[] {
  return works.map(toWorkListItem)
}

export function toWorkDetailDto(work: WorkDetailRow): WorkDetailDto {
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
    workItem: work.workItem,
    workNode: work.workNode,
    businessCategory: work.businessCategory,
    completeTime: formatDate(work.completeTime),
    completeForm: work.completeForm,
    isInnovation: work.isInnovation,
    responsibleLeader: work.responsibleLeader,
    responsiblePerson: work.responsiblePerson,
    proposedLeader: work.proposedLeader?.name || null,
    proposedLeaderId: work.proposedLeaderId,
    proposedScene: work.proposedScene,
    formedTime: formatDate(work.formedTime),
    workPlan: work.workPlan,
    planCompleteTime: formatDate(work.planCompleteTime),
    progress: work.progress,
    approvalLeaderId: work.approvalLeaderId,
    currentApproverId: work.currentApproverId,
    currentApproverRole: work.currentApproverRole,
    firstSubmitterId: work.firstSubmitterId,
    rejectReason: work.rejectReason,
    rejectedFromStatus: work.rejectedFromStatus,
    beforeApprovalStatus: work.beforeApprovalStatus,
    approvalType: work.approvalType,
    nodes: work.nodes
      ? processNodesForDisplay(JSON.parse(String(work.nodes)))
      : [],
    adjustHistory: work.adjustHistory
      ? processAdjustHistory(work.adjustHistory as unknown[])
      : [],
    attachments: work.attachments.map((a): WorkAttachmentDto => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      fileType: a.fileType,
      category: a.category,
      uploadedAt: a.uploadedAt.toISOString(),
      userId: a.userId,
      userName: a.user.name,
    })),
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  }
}
