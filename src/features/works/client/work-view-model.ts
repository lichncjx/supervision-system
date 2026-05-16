import { normalizeWorkStatus } from '@/features/works/domain/work-status.rules'
import type { WorkType, ActionType } from '@/features/works/domain/work-client.types'
import type { Work } from './work-view.types'

function normalizeAction(action: unknown): ActionType {
  const normalized = typeof action === 'string' ? action.toLowerCase() : ''
  if (normalized === 'complete') return 'complete'
  if (normalized === 'adjust') return 'adjust'
  if (normalized === 'cancel') return 'cancel'
  if (normalized === 'todo_decompose') return 'todo_decompose'
  return 'create'
}

function parseCooperators(value: unknown): import('@/features/works/domain/work-client.types').Cooperator[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item: any) => ({
      departmentId: Number(item?.departmentId) || 0,
      departmentName: item?.departmentName || undefined,
      leaderMemberId: item?.leaderMemberId ?? undefined,
      leader: item?.leader || undefined,
      personMemberId: item?.personMemberId ?? undefined,
      person: item?.person || undefined,
    }))
    .filter((c) => c.departmentId > 0)
}

export function transformWorkFromAPI(work: any): Work {
  const extractName = (obj: any): string => {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    if (typeof obj === 'object' && obj.name) return obj.name
    return ''
  }

  return {
    id: work.id,
    title: work.title,
    type: work.type as WorkType,
    departmentId: work.departmentId,
    departmentName: work.departmentName,
    cooperators: parseCooperators(work.cooperators),
    creatorRole: work.creatorRole || '',
    creatorId: work.creatorId,
    creatorName: work.creatorName,
    firstSubmitterId: work.firstSubmitterId ?? undefined,
    firstSubmitterName: work.firstSubmitterName,
    proposedLeader: extractName(work.proposedLeader),
    proposedLeaderId: work.proposedLeaderId,
    proposedLeaderRole: work.proposedLeaderRole,
    approvalLeaderId: work.approvalLeaderId,
    currentApproverId: work.currentApproverId,
    currentApproverRole: work.currentApproverRole,
    responsibleLeader: work.responsibleLeader,
    responsiblePerson: work.responsiblePerson,
    responsibleLeaderMemberId: work.responsibleLeaderMemberId ?? undefined,
    responsiblePersonMemberId: work.responsiblePersonMemberId ?? undefined,
    status: normalizeWorkStatus(work.status) || 'draft',
    action: normalizeAction(work.action),
    needCeo: work.type === '重点',
    isInnovation: work.isInnovation,
    nodes: work.nodes || [],
    businessCategory: work.businessCategory,
    workItem: work.workItem,
    workNode: work.workNode,
    completeTime: work.completeTime,
    completeForm: work.completeForm,
    proposedScene: work.proposedScene,
    formedTime: work.formedTime,
    workPlan: work.workPlan,
    planCompleteTime: work.planCompleteTime,
    progress: work.progress,
    rejectReason: work.rejectReason,
    rejectedAt: work.rejectedAt,
    rejectedFrom: normalizeWorkStatus(work.rejectedFrom || work.rejectedFromStatus) || undefined,
    rejectedFromStatus: normalizeWorkStatus(work.rejectedFromStatus) || null,
    adjustReason: work.adjustReason,
    cancelReason: work.cancelReason,
    createdAt: work.createdAt,
    updatedAt: work.updatedAt,
    attachments: work.attachments || [],
  }
}
