import { normalizeWorkStatus } from '@/features/works/domain/work-status.rules'
import type { WorkType, ActionType, Cooperator } from '@/features/works/client/work-client.types'
import type {
  CreateWorkRequest,
  UpdateWorkRequest,
  WorkApiDto,
  WorkPersonApiDto,
} from '@/features/works/contract/work-api.types'
import type { AttachmentDto } from '@/features/attachments/application/attachment.dto'
import type { AttachmentDto as Attachment } from '@/features/attachments/application/attachment.dto'
import type { Work, WorkEditablePatch } from './work-view.types'

function normalizeAction(action: unknown): ActionType {
  const normalized = typeof action === 'string' ? action.toLowerCase() : ''
  if (normalized === 'complete') return 'complete'
  if (normalized === 'adjust') return 'adjust'
  if (normalized === 'cancel') return 'cancel'
  if (normalized === 'todo_decompose') return 'todo_decompose'
  return 'create'
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function parseCooperators(value: unknown): Cooperator[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const cooperator = asRecord(item)
      return {
        departmentId: Number(cooperator.departmentId) || 0,
        departmentName: optionalString(cooperator.departmentName),
        leaderMemberId: optionalNumber(cooperator.leaderMemberId),
        leader: optionalString(cooperator.leader),
        personMemberId: optionalNumber(cooperator.personMemberId),
        person: optionalString(cooperator.person),
      }
    })
    .filter((c) => c.departmentId > 0)
}

function parseAttachments(value: AttachmentDto[] | undefined): Attachment[] {
  return (value || []).map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    fileSize: attachment.fileSize ?? 0,
    fileType: attachment.fileType ?? '',
    category: attachment.category ?? '',
    uploadedAt: attachment.uploadedAt,
    userId: attachment.userId,
    userName: attachment.userName,
  }))
}

function extractName(obj: WorkPersonApiDto | undefined): string | undefined {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return typeof obj.name === 'string' ? obj.name : undefined
}

export function transformWorkFromAPI(work: WorkApiDto): Work {
  return {
    id: work.id,
    title: work.title,
    type: work.type as WorkType,
    departmentId: work.departmentId ?? undefined,
    departmentName: work.departmentName ?? undefined,
    cooperators: parseCooperators(work.cooperators),
    creatorRole: work.creatorRole || '',
    creatorId: work.creatorId ?? 0,
    creatorName: work.creatorName ?? undefined,
    firstSubmitterId: work.firstSubmitterId ?? undefined,
    firstSubmitterName: work.firstSubmitterName ?? undefined,
    proposedLeader: extractName(work.proposedLeader),
    proposedLeaderId: work.proposedLeaderId ?? undefined,
    proposedLeaderRole: work.proposedLeaderRole ?? undefined,
    approvalLeaderId: work.approvalLeaderId ?? undefined,
    currentApproverId: work.currentApproverId ?? undefined,
    currentApproverRole: work.currentApproverRole ?? undefined,
    responsibleLeader: work.responsibleLeader ?? undefined,
    responsiblePerson: work.responsiblePerson ?? undefined,
    responsibleLeaderMemberId: work.responsibleLeaderMemberId ?? undefined,
    responsiblePersonMemberId: work.responsiblePersonMemberId ?? undefined,
    status: normalizeWorkStatus(work.status) || 'draft',
    action: normalizeAction(work.action),
    needCeo: work.type === '重点',
    isInnovation: work.isInnovation ?? undefined,
    nodes: Array.isArray(work.nodes) ? work.nodes : [],
    businessCategory: work.businessCategory ?? undefined,
    workItem: work.workItem ?? undefined,
    workNode: work.workNode ?? undefined,
    completeTime: work.completeTime ?? undefined,
    completeForm: work.completeForm ?? undefined,
    proposedScene: work.proposedScene ?? undefined,
    formedTime: work.formedTime ?? undefined,
    workPlan: work.workPlan ?? undefined,
    planCompleteTime: work.planCompleteTime ?? undefined,
    progress: work.progress ?? undefined,
    rejectReason: work.rejectReason || undefined,
    rejectedAt: work.rejectedAt || undefined,
    rejectedFrom: normalizeWorkStatus(work.rejectedFrom || work.rejectedFromStatus) || undefined,
    rejectedFromStatus: normalizeWorkStatus(work.rejectedFromStatus) || undefined,
    createdAt: work.createdAt ?? work.updatedAt,
    updatedAt: work.updatedAt,
    attachments: parseAttachments(work.attachments),
  }
}

export function buildCreateWorkRequest(
  work: Omit<Work, 'createdAt' | 'updatedAt'>,
): CreateWorkRequest {
  return {
    type: work.type,
    title: work.title,
    departmentId: work.departmentId ?? null,
    workItem: work.workItem ?? null,
    workNode: work.workNode ?? null,
    businessCategory: work.businessCategory ?? null,
    completeForm: work.completeForm ?? null,
    isInnovation: work.isInnovation ?? null,
    responsibleLeader: work.responsibleLeader ?? null,
    responsiblePerson: work.responsiblePerson ?? null,
    responsibleLeaderMemberId: work.responsibleLeaderMemberId ?? null,
    responsiblePersonMemberId: work.responsiblePersonMemberId ?? null,
    proposedLeader: work.proposedLeader ?? null,
    proposedLeaderId: work.proposedLeaderId ?? null,
    proposedScene: work.proposedScene ?? null,
    formedTime: work.formedTime ?? null,
    cooperators: work.cooperators ?? [],
    workPlan: work.workPlan ?? null,
    planCompleteTime: work.planCompleteTime ?? null,
    progress: work.progress ?? null,
    approvalLeaderId: work.approvalLeaderId ?? null,
    nodes: work.nodes ?? [],
  }
}

export function buildUpdateWorkRequest(patch: WorkEditablePatch): UpdateWorkRequest {
  const data: UpdateWorkRequest = {}

  if ('title' in patch) data.title = patch.title ?? null
  if ('departmentId' in patch && patch.departmentId != null) data.departmentId = patch.departmentId
  if ('workItem' in patch) data.workItem = patch.workItem ?? null
  if ('workNode' in patch) data.workNode = patch.workNode ?? null
  if ('businessCategory' in patch) data.businessCategory = patch.businessCategory ?? null
  if ('completeForm' in patch) data.completeForm = patch.completeForm ?? null
  if ('isInnovation' in patch) data.isInnovation = patch.isInnovation ?? null
  if ('responsibleLeader' in patch) data.responsibleLeader = patch.responsibleLeader ?? null
  if ('responsiblePerson' in patch) data.responsiblePerson = patch.responsiblePerson ?? null
  if ('responsibleLeaderMemberId' in patch)
    data.responsibleLeaderMemberId = patch.responsibleLeaderMemberId ?? null
  if ('responsiblePersonMemberId' in patch)
    data.responsiblePersonMemberId = patch.responsiblePersonMemberId ?? null
  if ('proposedLeader' in patch) data.proposedLeader = patch.proposedLeader ?? null
  if ('proposedLeaderId' in patch) data.proposedLeaderId = patch.proposedLeaderId ?? null
  if ('proposedScene' in patch) data.proposedScene = patch.proposedScene ?? null
  if ('formedTime' in patch) data.formedTime = patch.formedTime ?? null
  if ('cooperators' in patch) data.cooperators = patch.cooperators ?? []
  if ('workPlan' in patch) data.workPlan = patch.workPlan ?? null
  if ('planCompleteTime' in patch) data.planCompleteTime = patch.planCompleteTime ?? null
  if ('progress' in patch) data.progress = patch.progress ?? null
  if ('approvalLeaderId' in patch) data.approvalLeaderId = patch.approvalLeaderId ?? null
  if ('nodes' in patch) data.nodes = patch.nodes ?? []

  return data
}
