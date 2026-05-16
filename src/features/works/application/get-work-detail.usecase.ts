import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canViewWorkItem } from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import { findWorkDetailById } from '@/features/works/infrastructure/work.repository'
import type { WorkDetailRow } from '@/features/works/infrastructure/work.repository'
import { formatDate } from '@/shared/utils/date'
import { processNodesForDisplay, processAdjustHistory } from '@/features/works/application/work-display.utils'

interface WorkAttachmentDto {
  id: number; fileName: string; fileSize: number | null; fileType: string | null
  category: string | null; uploadedAt: string; userId: number; userName: string
}

interface WorkDetailDto {
  id: number; title: string; type: string; status: string
  departmentId: number | null; cooperators: unknown; departmentName: string
  creatorId: number | null; creatorName: string; creatorRole: string
  workItem: string | null; workNode: string | null; businessCategory: string | null
  completeTime: string | null; completeForm: string | null; isInnovation: boolean | null
  responsibleLeader: string | null; responsiblePerson: string | null
  responsibleLeaderMemberId: number | null; responsiblePersonMemberId: number | null
  proposedLeader: string | null; proposedLeaderId: number | null; proposedScene: string | null
  formedTime: string | null; workPlan: string | null; planCompleteTime: string | null
  progress: string | null; approvalLeaderId: number | null
  currentApproverId: number | null; currentApproverRole: string | null
  firstSubmitterId: number | null; firstSubmitterName: string | null; rejectReason: string | null
  rejectedFromStatus: string | null; beforeApprovalStatus: string | null
  approvalType: string | null; nodes: unknown; adjustHistory: unknown
  attachments: WorkAttachmentDto[]; createdAt: string; updatedAt: string
}

function toWorkDetailDto(work: WorkDetailRow): WorkDetailDto {
  return {
    id: work.id, title: work.title,
    type: ({ PRIORITY: '重点', MAIN: '主要', TODO: '待办' } as Record<string, string>)[work.type] || work.type,
    status: work.status, departmentId: work.departmentId,
    cooperators: work.cooperators,
    departmentName: work.department?.name || '-',
    creatorId: work.creatorId,
    creatorName: work.creator?.name || '-',
    creatorRole: work.creator?.role || '-',
    workItem: work.workItem, workNode: work.workNode,
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
    approvalLeaderId: work.approvalLeaderId,
    currentApproverId: work.currentApproverId,
    currentApproverRole: work.currentApproverRole,
    firstSubmitterId: work.firstSubmitterId,
    firstSubmitterName: work.firstSubmitter?.name || null,
    rejectReason: work.rejectReason,
    rejectedFromStatus: work.rejectedFromStatus,
    beforeApprovalStatus: work.beforeApprovalStatus,
    approvalType: work.approvalType,
    nodes: work.nodes ? processNodesForDisplay(JSON.parse(String(work.nodes))) : [],
    adjustHistory: work.adjustHistory ? processAdjustHistory(work.adjustHistory as unknown[]) : [],
    attachments: work.attachments.map((a): WorkAttachmentDto => ({
      id: a.id, fileName: a.fileName, fileSize: a.fileSize,
      fileType: a.fileType, category: a.category,
      uploadedAt: a.uploadedAt.toISOString(),
      userId: a.userId, userName: a.user.name,
    })),
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  }
}

export interface GetWorkDetailInput {
  currentUser: BaseCurrentUser
  workId: number
}

export async function getWorkDetailUseCase(input: GetWorkDetailInput) {
  const { currentUser, workId } = input

  const work = await findWorkDetailById(workId)

  if (!work) {
    return { kind: 'not-found' as const }
  }

  if (!canViewWorkItem(currentUser as PermissionUser, work)) {
    return { kind: 'forbidden' as const }
  }

  return { kind: 'ok' as const, data: toWorkDetailDto(work) }
}
