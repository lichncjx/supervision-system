import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { Prisma } from '@prisma/client'
import { WorkItemType, WorkItemStatus } from '@prisma/client'

export interface QueryWorksParams {
  type: string | null; status: string | null; departmentId: string | null; keyword: string | null
}

export type StatusFilter =
  | { kind: 'where'; where: Prisma.WorkItemWhereInput }
  | { kind: 'post'; where: Prisma.WorkItemWhereInput; postFilter: 'handling' | 'overdue' | 'expiring' | 'approving' }
  | { kind: 'invalid' }

const APPROVING_STATUSES = [WorkItemStatus.PROPOSING, WorkItemStatus.ADJUSTING, WorkItemStatus.CANCELLING, WorkItemStatus.COMPLETING]
const TERMINAL_STATUSES: WorkItemStatus[] = [WorkItemStatus.COMPLETED, WorkItemStatus.CANCELLED]

export function parseWorkType(raw: string | null): WorkItemType | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'priority') return WorkItemType.PRIORITY
  if (lower === 'main') return WorkItemType.MAIN
  if (lower === 'todo') return WorkItemType.TODO
  return null
}

export function parseWorkStatusFilter(raw: string | null): StatusFilter {
  if (!raw) return null as unknown as StatusFilter
  const normalized = raw.trim()
  const lower = normalized.toLowerCase()
  if (!normalized) return null as unknown as StatusFilter
  if (lower === 'draft') return { kind: 'where', where: { status: WorkItemStatus.DRAFT, rejectReason: null, rejectedFromStatus: null } }
  if (lower === 'returneddraft' || lower === 'returned_draft') return { kind: 'where', where: { status: WorkItemStatus.DRAFT, OR: [{ rejectReason: { not: null } }, { rejectedFromStatus: { not: null } }] } }
  if (lower === 'pendingdecompose' || lower === 'pending_decompose') return { kind: 'where', where: { status: WorkItemStatus.PENDING_DECOMPOSE } }
  const exact = Object.values(WorkItemStatus).find((v) => v === normalized.toUpperCase())
  if (exact) return { kind: 'where', where: { status: exact } }
  if (lower === 'approving') return { kind: 'post', where: { status: { in: APPROVING_STATUSES } }, postFilter: 'approving' }
  if (lower === 'inprogress' || lower === 'in_progress') return { kind: 'where', where: { status: WorkItemStatus.IN_PROGRESS } }
  if (lower === 'completed') return { kind: 'where', where: { status: WorkItemStatus.COMPLETED } }
  if (lower === 'cancelled') return { kind: 'where', where: { status: WorkItemStatus.CANCELLED } }
  if (lower === 'handling') return { kind: 'post', where: { status: { in: [WorkItemStatus.DRAFT, WorkItemStatus.PENDING_DECOMPOSE, WorkItemStatus.IN_PROGRESS] } }, postFilter: 'handling' }
  if (lower === 'overdue' || lower === 'expiring') return { kind: 'post', where: { status: { notIn: TERMINAL_STATUSES } }, postFilter: lower as 'overdue' | 'expiring' }
  return { kind: 'invalid' }
}
import { canViewWorkItem, shouldHandleWorkItem, canApproveWorkItem } from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import { buildWorksWhere } from '@/features/works/infrastructure/work.query-builder'
import {
  findManyWorks,
  type WorkListRow,
} from '@/features/works/infrastructure/work.repository'
import { formatDate } from '@/shared/utils/date'
import { processNodesForDisplay, processAdjustHistory } from '@/features/works/application/work-display.utils'

interface WorkListItemDto { id: number; title: string; type: string; status: string; departmentId: number | null; cooperators: unknown; departmentName: string; creatorId: number | null; creatorName: string; creatorRole: string; workItem: string | null; workNode: string | null; businessCategory: string | null; completeTime: string | null; completeForm: string | null; isInnovation: boolean | null; responsibleLeader: string | null; responsiblePerson: string | null; proposedLeader: string | null; proposedLeaderId: number | null; proposedScene: string | null; formedTime: string | null; workPlan: string | null; planCompleteTime: string | null; progress: string | null; action: string | null; approvalLeaderId: number | null; currentApproverId: number | null; currentApproverRole: string | null; firstSubmitterId: number | null; rejectReason: string | null; rejectedFromStatus: string | null; beforeApprovalStatus: string | null; approvalType: string | null; nodes: unknown; adjustHistory: unknown; createdAt: string; updatedAt: string }

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== 'string') return value as T
  try { return JSON.parse(value) as T } catch { return fallback }
}

const TYPE_LABEL: Record<string, string> = { PRIORITY: '重点', MAIN: '主要', TODO: '待办' }

function toWorkListItem(work: WorkListRow): WorkListItemDto {
  return {
    id: work.id, title: work.title,
    type: TYPE_LABEL[work.type] || work.type,
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
    proposedLeader: work.proposedLeader?.name || null,
    proposedLeaderId: work.proposedLeaderId,
    proposedScene: work.proposedScene,
    formedTime: formatDate(work.formedTime),
    workPlan: work.workPlan,
    planCompleteTime: formatDate(work.planCompleteTime),
    progress: work.progress, action: work.action,
    approvalLeaderId: work.approvalLeaderId,
    currentApproverId: work.currentApproverId,
    currentApproverRole: work.currentApproverRole,
    firstSubmitterId: work.firstSubmitterId,
    rejectReason: work.rejectReason,
    rejectedFromStatus: work.rejectedFromStatus,
    beforeApprovalStatus: work.beforeApprovalStatus,
    approvalType: work.approvalType,
    nodes: processNodesForDisplay(parseJsonField(work.nodes, [])),
    adjustHistory: processAdjustHistory(parseJsonField(work.adjustHistory, [])),
    createdAt: work.createdAt.toISOString(),
    updatedAt: work.updatedAt.toISOString(),
  }
}

function toWorkListItems(works: WorkListRow[]): WorkListItemDto[] {
  return works.map(toWorkListItem)
}

export interface QueryWorksInput {
  currentUser: BaseCurrentUser
  params: QueryWorksParams
}

const EXPIRING_DAYS = 7

function getDueDate(work: {
  type: WorkItemType
  planCompleteTime: Date | null
}) {
  return work.planCompleteTime
}

function isOverdueWork(
  work: { type: WorkItemType; status: WorkItemStatus; planCompleteTime: Date | null },
  now: Date,
) {
  if (TERMINAL_STATUSES.includes(work.status)) return false
  const dueDate = getDueDate(work)
  return dueDate ? dueDate < now : false
}

function isExpiringWork(
  work: { type: WorkItemType; status: WorkItemStatus; planCompleteTime: Date | null },
  now: Date,
) {
  if (TERMINAL_STATUSES.includes(work.status)) return false
  const dueDate = getDueDate(work)
  if (!dueDate) return false
  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + EXPIRING_DAYS)
  return dueDate >= now && dueDate <= deadline
}

function applyPostFilter(
  works: WorkListRow[],
  statusFilter: StatusFilter,
  currentUser: PermissionUser,
): WorkListRow[] {
  if (statusFilter?.kind !== 'post') return works

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return works.filter((work) => {
    if (statusFilter.postFilter === 'handling')
      return shouldHandleWorkItem(currentUser, work)
    if (statusFilter.postFilter === 'approving')
      return canApproveWorkItem(currentUser, work)
    if (statusFilter.postFilter === 'overdue')
      return isOverdueWork(work, today)
    if (statusFilter.postFilter === 'expiring')
      return isExpiringWork(work, today)
    return true
  })
}

export async function queryWorksUseCase(input: QueryWorksInput) {
  const { currentUser, params } = input

  const workType = parseWorkType(params.type)
  const statusFilter = parseWorkStatusFilter(params.status)

  const { where } = buildWorksWhere(
    currentUser as PermissionUser,
    workType,
    statusFilter,
    params,
  )

  const works = await findManyWorks(where)

  const viewableWorks = works.filter((work) =>
    canViewWorkItem(currentUser as PermissionUser, work),
  )

  const filteredWorks = applyPostFilter(
    viewableWorks,
    statusFilter,
    currentUser as PermissionUser,
  )

  return toWorkListItems(filteredWorks)
}
