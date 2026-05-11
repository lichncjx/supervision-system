import { formatDate, processNodesForDisplay, processAdjustHistory } from '@/lib/utils'
import type { WorkListItemDto } from './work.dto'
import type { WorkListRow } from '@/features/works/infrastructure/work.repository'

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

export function toWorkListItems(works: WorkListRow[]): WorkListItemDto[] {
  return works.map(toWorkListItem)
}
