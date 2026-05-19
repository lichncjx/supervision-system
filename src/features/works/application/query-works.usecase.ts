import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { WorkItemType, WorkItemStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { canViewWorkItem, shouldHandleWorkItem, canApproveWorkItem, buildWorkVisibilityWhere } from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import { isDepartmentLevel, isGlobalView } from '@/features/users/domain/role.rules'
import {
  findManyWorks,
  findCooperatorWorkItemIds,
  type WorkListRow,
} from '@/features/works/infrastructure/work.repository'
import { formatDate } from '@/shared/utils/date'
import { processNodesForDisplay, processAdjustHistory } from '@/features/works/application/work-display.utils'

// ── Types ──

export interface QueryWorksParams {
  type: string | null;
  status: string | null;
  departmentId: string | null;
  keyword: string | null;
}

export type StatusFilter = { kind: 'where'; where: Prisma.WorkItemWhereInput; } |
{ kind: 'post'; where: Prisma.WorkItemWhereInput; postFilter: 'handling' | 'overdue' | 'expiring' | 'approving'; };

export interface QueryWorksInput {
  currentUser: BaseCurrentUser
  params: QueryWorksParams
}

interface WorkListItemDto {
  id: number;
  title: string;
  type: string;
  status: string;
  departmentId: number | null
  cooperators: unknown
  departmentName: string
  creatorId: number | null
  creatorName: string
  creatorRole: string
  workItem: string | null
  workNode: string | null
  businessCategory: string | null
  completeTime: string | null
  completeForm: string | null
  isInnovation: boolean | null
  responsibleLeader: string | null
  responsiblePerson: string | null
  responsibleLeaderMemberId: number | null
  responsiblePersonMemberId: number | null
  proposedLeader: string | null
  proposedLeaderId: number | null
  proposedScene: string | null
  formedTime: string | null
  workPlan: string | null
  planCompleteTime: string | null
  progress: string | null
  action: string | null
  approvalLeaderId: number | null
  currentApproverId: number | null
  currentApproverRole: string | null
  firstSubmitterId: number | null
  rejectReason: string | null
  rejectedFromStatus: string | null
  beforeApprovalStatus: string | null
  approvalType: string | null
  nodes: unknown
  adjustHistory: unknown
  createdAt: string
  updatedAt: string
}

// ── Constants ──

const APPROVING_STATUSES = [WorkItemStatus.PROPOSING, WorkItemStatus.ADJUSTING, WorkItemStatus.CANCELLING, WorkItemStatus.COMPLETING]
const ON_GOING_STATUSES = [WorkItemStatus.DRAFT, WorkItemStatus.PENDING_DECOMPOSE, WorkItemStatus.IN_PROGRESS]
const TERMINAL_STATUSES: WorkItemStatus[] = [WorkItemStatus.COMPLETED, WorkItemStatus.CANCELLED]
const EXPIRING_DAYS = 7
const TYPE_LABEL: Record<string, string> = { PRIORITY: '重点', MAIN: '主要', TODO: '待办' }

// ── Parsers ──

function parseWorkType(raw: string | null): WorkItemType | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'priority') return WorkItemType.PRIORITY
  if (lower === 'main') return WorkItemType.MAIN
  if (lower === 'todo') return WorkItemType.TODO
  return null
}

function parseWorkStatusFilter(raw: string | null): StatusFilter | null {
  if (!raw) return null
  const normalized = raw.trim()
  if (!normalized) return null
  const lower = normalized.toLowerCase()

  // 特殊 where 条件（比纯 status 复杂）
  if (lower === 'draft') return { kind: 'where', where: { status: WorkItemStatus.DRAFT, rejectReason: null, rejectedFromStatus: null } }
  if (lower === 'returneddraft' || lower === 'returned_draft') return { kind: 'where', where: { status: WorkItemStatus.DRAFT, OR: [{ rejectReason: { not: null } }, { rejectedFromStatus: { not: null } }] } }

  // Post 过滤
  if (lower === 'handling') return { kind: 'post', where: { status: { in: ON_GOING_STATUSES } }, postFilter: 'handling' }
  if (lower === 'approving') return { kind: 'post', where: { status: { in: APPROVING_STATUSES } }, postFilter: 'approving' }
  if (lower === 'overdue' || lower === 'expiring') return { kind: 'post', where: { status: { notIn: TERMINAL_STATUSES } }, postFilter: lower as 'overdue' | 'expiring' }

  // camelCase → UPPER_SNAKE_CASE（inProgress → IN_PROGRESS, pendingDecompose → PENDING_DECOMPOSE）
  const upper = normalized.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()

  // 枚举精确匹配
  const exact = Object.values(WorkItemStatus).find((v) => v === upper)
  if (exact) return { kind: 'where', where: { status: exact } }

  return null
}

// ── Private helpers ──

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== 'string') return value as T
  try { return JSON.parse(value) as T } catch { return fallback }
}

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
    responsibleLeaderMemberId: work.responsibleLeaderMemberId,
    responsiblePersonMemberId: work.responsiblePersonMemberId,
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

function getDueDate(work: {
  type: WorkItemType
  planCompleteTime: Date | null
}) {
  return work.planCompleteTime
}

function isTerminalStatus(status: WorkItemStatus) {
  return TERMINAL_STATUSES.includes(status)
}

function isOverdueWork(
  work: { type: WorkItemType; status: WorkItemStatus; planCompleteTime: Date | null },
  now: Date,
) {
  if (isTerminalStatus(work.status)) return false

  const dueDate = getDueDate(work)
  return dueDate ? dueDate < now : false
}

function isExpiringWork(
  work: { type: WorkItemType; status: WorkItemStatus; planCompleteTime: Date | null },
  now: Date,
) {
  if (isTerminalStatus(work.status)) return false

  const deadline = new Date(now.getTime() + EXPIRING_DAYS * 86400000)
  const dueDate = getDueDate(work)
  return dueDate ? dueDate >= now && dueDate <= deadline : false
}

function applyPostFilter(
  works: WorkListRow[],
  statusFilter: StatusFilter | null,
  currentUser: PermissionUser,
): WorkListRow[] {
  if (statusFilter?.kind !== 'post') return works

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isGlobalViewer = isGlobalView(currentUser.role)

  return works.filter((work) => {
    if (statusFilter.postFilter === 'handling')
      return isGlobalViewer || shouldHandleWorkItem(currentUser, work)
    if (statusFilter.postFilter === 'approving')
      return isGlobalViewer || canApproveWorkItem(currentUser, work)
    if (statusFilter.postFilter === 'overdue')
      return isOverdueWork(work, today)
    if (statusFilter.postFilter === 'expiring')
      return isExpiringWork(work, today)
    return true
  })
}

function buildWorksWhere(
  params: QueryWorksParams,
  currentUser: PermissionUser,
  cooperatorWorkIds?: number[],
): { where: Prisma.WorkItemWhereInput; statusFilter: StatusFilter | null } {
  const workType = parseWorkType(params.type)
  const statusFilter = parseWorkStatusFilter(params.status)

  const filters: Prisma.WorkItemWhereInput[] = [
    buildWorkVisibilityWhere(currentUser, cooperatorWorkIds),
  ]

  if (workType) {
    filters.push({ type: workType })
  }

  if (statusFilter) {
    filters.push(statusFilter.where)
  }

  if (params.departmentId) {
    filters.push({ OR: [{ departmentId: Number(params.departmentId) }] })
  }

  if (params.keyword) {
    filters.push({
      OR: [
        { title: { contains: params.keyword, mode: 'insensitive' } },
        { workItem: { contains: params.keyword, mode: 'insensitive' } },
        { businessCategory: { contains: params.keyword, mode: 'insensitive' } },
        { proposedScene: { contains: params.keyword, mode: 'insensitive' } },
        { progress: { contains: params.keyword, mode: 'insensitive' } },
        { workPlan: { contains: params.keyword, mode: 'insensitive' } },
      ],
    })
  }

  const where = filters.length > 1 ? { AND: filters } : (filters[0] ?? {})
  return { where, statusFilter }
}

// ── Usecase ──

/** 查询事项列表：SQL 粗筛 → 权限/状态后过滤 → 转 DTO */
export async function queryWorksUseCase(input: QueryWorksInput) {
  const { currentUser, params } = input

  // 部门级用户需额外查出作为配合部门的事项 ID
  let cooperatorWorkIds: number[] | undefined
  if (isDepartmentLevel(currentUser.role) && currentUser.departmentId) {
    cooperatorWorkIds = await findCooperatorWorkItemIds(currentUser.departmentId)
  }

  // 构建 WHERE（可见性 + 类型/状态/部门/关键词），同时解析 statusFilter 供后过滤用
  const { where, statusFilter } = buildWorksWhere(
    params,
    currentUser as PermissionUser,
    cooperatorWorkIds,
  )

  const works = await findManyWorks(where)

  // 权限后过滤（兜底，与 WHERE 可见性逻辑一致）
  const viewableWorks = works.filter((work) =>
    canViewWorkItem(currentUser as PermissionUser, work),
  )

  // 状态后过滤（handling/approving/overdue/expiring 需应用层判断）
  const filteredWorks = applyPostFilter(
    viewableWorks,
    statusFilter,
    currentUser as PermissionUser,
  )

  return toWorkListItems(filteredWorks)
}
