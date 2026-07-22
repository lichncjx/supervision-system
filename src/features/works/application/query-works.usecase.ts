import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { WorkItemType, WorkItemStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { type Result, err, ok } from '@/shared/result'
import {
  canViewWorkItem,
  shouldHandleWorkItem,
  canApproveWorkItem,
} from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { isGlobalView } from '@/features/users/domain/role.rules'
import { findManyWorks, type WorkListRow } from '@/features/works/infrastructure/work.repository'
import { buildWorkVisibilityWhere } from '@/shared/db/work-visibility-builder'
import { toWorkDto } from '@/features/works/application/work.mapper'
import type { WorkDto } from './work.dto'
import {
  isExpiringWorkItem,
  isOverdueWorkItem,
} from '@/features/works/domain/work-status.rules'
import {
  normalizeAssessmentYear,
  normalizeWorkStructureText,
} from '@/features/works/domain/work-structure.rules'
import { buildWorkKeywordWhere } from '@/features/works/application/work-keyword-search'
import { getDefaultAssessmentYear } from '@/features/system-settings/application/system-settings.usecase'

// ── Types ──

export interface QueryWorksParams {
  type: string | null
  status: string | null
  departmentId: string | null
  keyword: string | null
  assessmentYear: string | null
  workItem: string | null
}

export type StatusFilter =
  | { kind: 'where'; where: Prisma.WorkItemWhereInput }
  | {
    kind: 'post'
    where: Prisma.WorkItemWhereInput
    postFilter: 'handling' | 'overdue' | 'expiring' | 'approving'
  }

export interface QueryWorksInput {
  currentUser: BaseCurrentUser
  params: QueryWorksParams
}

// ── Constants ──

const APPROVING_STATUSES = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
]
const ON_GOING_STATUSES = [
  WorkItemStatus.DRAFT,
  WorkItemStatus.PENDING_DECOMPOSE,
  WorkItemStatus.IN_PROGRESS,
]
const TERMINAL_STATUSES = [
  WorkItemStatus.COMPLETED,
  WorkItemStatus.CANCELLED,
]

// ── Parsers ──

function hasFilterValue(raw: string | null) {
  return Boolean(raw?.trim())
}

function parseWorkType(raw: string | null): WorkItemType | null {
  if (!raw) return null
  const normalized = raw.trim()
  if (!normalized) return null

  const lower = normalized.toLowerCase()
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
  if (lower === 'draft')
    return {
      kind: 'where',
      where: { status: WorkItemStatus.DRAFT, rejectReason: null, rejectedFromStatus: null },
    }
  if (lower === 'returneddraft' || lower === 'returned_draft')
    return {
      kind: 'where',
      where: {
        status: WorkItemStatus.DRAFT,
        OR: [{ rejectReason: { not: null } }, { rejectedFromStatus: { not: null } }],
      },
    }

  // Post 过滤
  if (lower === 'handling')
    return {
      kind: 'post',
      where: { status: { in: ON_GOING_STATUSES } },
      postFilter: 'handling',
    }
  if (lower === 'approving')
    return {
      kind: 'post',
      where: { status: { in: APPROVING_STATUSES } },
      postFilter: 'approving',
    }
  if (lower === 'overdue' || lower === 'expiring')
    return {
      kind: 'post',
      where: { status: { notIn: TERMINAL_STATUSES } },
      postFilter: lower as 'overdue' | 'expiring',
    }

  // camelCase → UPPER_SNAKE_CASE（inProgress → IN_PROGRESS, pendingDecompose → PENDING_DECOMPOSE）
  const upper = normalized.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()

  // 枚举精确匹配
  const exact = Object.values(WorkItemStatus).find((v) => v === upper)
  if (exact) return { kind: 'where', where: { status: exact } }

  return null
}

// ── Private helpers ──

function toWorkListItems(works: WorkListRow[]): WorkDto[] {
  return works.map(toWorkDto)
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
    if (statusFilter.postFilter === 'overdue') return isOverdueWorkItem(work, today)
    if (statusFilter.postFilter === 'expiring') return isExpiringWorkItem(work, today)
    return true
  })
}

async function buildWorksWhere(
  params: QueryWorksParams,
  currentUser: PermissionUser,
): Promise<
  | { ok: true; where: Prisma.WorkItemWhereInput; statusFilter: StatusFilter | null }
  | { ok: false; status: number; message: string }
> {
  const workType = parseWorkType(params.type)
  if (hasFilterValue(params.type) && !workType) {
    return err(400, '无效的事项类型筛选条件')
  }

  const statusFilter = parseWorkStatusFilter(params.status)
  if (hasFilterValue(params.status) && !statusFilter) {
    return err(400, '无效的事项状态筛选条件')
  }

  const filters: Prisma.WorkItemWhereInput[] = [await buildWorkVisibilityWhere(currentUser)]
  const isAllYears = params.assessmentYear?.trim().toLowerCase() === 'all'
  const assessmentYear = normalizeAssessmentYear(params.assessmentYear)
  if (hasFilterValue(params.assessmentYear) && !assessmentYear && !isAllYears) {
    return err(400, '无效的年度筛选条件')
  }

  const exactWorkItem = normalizeWorkStructureText(params.workItem)
  if (hasFilterValue(params.workItem) && (!workType || !assessmentYear || !exactWorkItem)) {
    return err(400, '精确工作事项筛选必须同时指定类型和年度')
  }

  if (workType) {
    filters.push({ type: workType })
  }

  if (!isAllYears) {
    filters.push({ assessmentYear: assessmentYear || await getDefaultAssessmentYear() })
  }

  if (exactWorkItem) {
    filters.push({ workItem: exactWorkItem })
  }

  if (statusFilter) {
    filters.push(statusFilter.where)
  }

  if (params.departmentId) {
    filters.push({ OR: [{ departmentId: Number(params.departmentId) }] })
  }

  const keywordWhere = buildWorkKeywordWhere(params.keyword)
  if (keywordWhere) filters.push(keywordWhere)

  const where = filters.length > 1 ? { AND: filters } : (filters[0] ?? {})
  return { ok: true, where, statusFilter }
}

// ── Usecase ──

/** 查询事项列表：SQL 粗筛 → 权限/状态后过滤 → 转 DTO */
export async function queryWorksUseCase(input: QueryWorksInput): Promise<Result<WorkDto[]>> {
  const { currentUser, params } = input
  const permUser = toPermissionUser(currentUser)

  // 构建 WHERE（可见性 + 类型/状态/部门/关键词），同时解析 statusFilter 供后过滤用
  const whereResult = await buildWorksWhere(params, permUser)
  if (!whereResult.ok) return whereResult

  const { where, statusFilter } = whereResult

  // SQL 粗筛（包含权限相关的可见性过滤）
  const works = await findManyWorks(where)

  // 权限后过滤（兜底，与 WHERE 可见性逻辑一致）
  const viewableWorks = works.filter((work) => canViewWorkItem(permUser, work))

  // 状态后过滤（handling/approving/overdue/expiring 需应用层判断）
  const filteredWorks = applyPostFilter(viewableWorks, statusFilter, permUser)

  return ok(toWorkListItems(filteredWorks))
}
