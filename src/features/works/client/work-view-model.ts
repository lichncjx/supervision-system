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
      leader: item?.leader || undefined,
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
    creatorRole: work.creatorRole || work.creator_role || '',
    creatorId: work.creatorId || work.creator_id,
    creatorName: work.creatorName,
    firstSubmitterId: work.firstSubmitterId ?? undefined,
    proposedLeader: extractName(work.proposedLeader),
    proposedLeaderId: work.proposedLeaderId || work.proposed_leader_id,
    proposedLeaderRole: work.proposedLeaderRole || work.proposed_leader_role,
    approvalLeaderId: work.approvalLeaderId || work.approval_leader_id,
    currentApproverId: work.currentApproverId || work.current_approver_id,
    currentApproverRole: work.currentApproverRole || work.current_approver_role,
    responsibleLeader: work.responsibleLeader || work.responsible_leader,
    responsiblePerson: work.responsiblePerson || work.responsible_person,
    status: normalizeWorkStatus(work.status) || 'draft',
    action: normalizeAction(work.action || work.action_type),
    needCeo: work.type === '重点',
    isInnovation: work.isInnovation || work.is_innovation,
    nodes: work.nodes || [],
    businessCategory: work.businessCategory || work.business_category,
    workItem: work.workItem || work.work_item,
    workNode: work.workNode || work.work_node,
    completeTime: work.completeTime || work.complete_time,
    completeForm: work.completeForm || work.complete_form,
    proposedScene: work.proposedScene || work.proposed_scene,
    formedTime: work.formedTime || work.formed_time,
    workPlan: work.workPlan || work.work_plan,
    planCompleteTime: work.planCompleteTime || work.plan_complete_time,
    progress: work.progress,
    rejectReason: work.rejectReason || work.reject_reason,
    rejectedAt: work.rejectedAt || work.rejected_at,
    rejectedFrom: normalizeWorkStatus(work.rejectedFrom || work.rejected_from_status || work.rejectedFromStatus) || undefined,
    rejectedFromStatus: normalizeWorkStatus(work.rejectedFromStatus || work.rejected_from_status) || null,
    adjustReason: work.adjustReason || work.adjust_reason,
    cancelReason: work.cancelReason || work.cancel_reason,
    createdAt: work.createdAt || work.created_at,
    updatedAt: work.updatedAt || work.updated_at,
    attachments: work.attachments || [],
  }
}
