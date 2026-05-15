import type { CurrentUser } from '@/shared/auth/current-user'
import { WorkItemStatus, WorkItemType } from '@prisma/client'

export interface ExportWorksToExcelInput {
  currentUser: CurrentUser
  type: string | null
  status: string | null
  departmentId: string | null
  keyword: string | null
}

export type ExportWorksToExcelResult =
  | {
      kind: 'ok'
      buffer: Buffer
      fileName: string
      visibleItemCount: number
    }
  | { kind: 'error'; status: number; message: string }
import {
  buildWorkVisibilityWhere,
  canViewWorkItem,
  shouldHandleWorkItem,
  getCooperatorDepartmentIds,
  getResponsibleDepartmentIds,
} from '@/lib/server-permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import {
  findWorksForExport,
  createExportOperationLog,
} from '@/features/excel/infrastructure/excel-work.repository'
import { generateExportBuffer } from '@/features/excel/infrastructure/work-exporter'

const EXPIRING_DAYS = 7
const APPROVING_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
]
const TERMINAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETED,
  WorkItemStatus.CANCELLED,
]

function normalizeTypeFilter(
  type: string | null,
): WorkItemType | null {
  if (!type) return null
  const normalized = type.toUpperCase()
  if (normalized === WorkItemType.PRIORITY) return WorkItemType.PRIORITY
  if (normalized === WorkItemType.MAIN) return WorkItemType.MAIN
  if (normalized === WorkItemType.TODO) return WorkItemType.TODO
  return null
}

function normalizeStatusFilter(status: string | null): string | null {
  if (!status || status === 'all') return null
  const normalized = status.toUpperCase()
  return Object.values(WorkItemStatus).includes(
    normalized as WorkItemStatus,
  )
    ? normalized
    : null
}

function getDueDate(workItem: {
  type: WorkItemType
  planCompleteTime: Date | null
}): Date | null {
  return workItem.planCompleteTime
}

function isOverdueWork(
  workItem: {
    type: WorkItemType
    status: WorkItemStatus
    planCompleteTime: Date | null
  },
  now: Date,
): boolean {
  if (TERMINAL_STATUSES.includes(workItem.status)) return false
  const dueDate = getDueDate(workItem)
  return dueDate ? dueDate < now : false
}

function isExpiringWork(
  workItem: {
    type: WorkItemType
    status: WorkItemStatus
    planCompleteTime: Date | null
  },
  now: Date,
): boolean {
  if (TERMINAL_STATUSES.includes(workItem.status)) return false
  const dueDate = getDueDate(workItem)
  if (!dueDate) return false
  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + EXPIRING_DAYS)
  return dueDate >= now && dueDate <= deadline
}

function isValidStatusFilter(status: string | null): boolean {
  if (!status || status === 'all') return true
  const lower = status.toLowerCase()
  return (
    Boolean(normalizeStatusFilter(status)) ||
    [
      'draft',
      'returneddraft',
      'returned_draft',
      'pendingdecompose',
      'pending_decompose',
      'approving',
      'handling',
      'inprogress',
      'in_progress',
      'completed',
      'cancelled',
      'overdue',
      'expiring',
    ].includes(lower)
  )
}

function keywordMatches(
  workItem: {
    title: string
    workItem: string | null
    businessCategory: string | null
  },
  keyword: string | null,
): boolean {
  if (!keyword) return true
  return [workItem.title, workItem.workItem, workItem.businessCategory]
    .filter(Boolean)
    .some((value) => String(value).includes(keyword))
}

export async function exportWorksToExcelUseCase(
  input: ExportWorksToExcelInput,
): Promise<ExportWorksToExcelResult> {
  const { currentUser, type, status, departmentId, keyword } = input

  const typeFilter = normalizeTypeFilter(type)
  if (type && !typeFilter) {
    return { kind: 'error', status: 400, message: '无效的事项类型' }
  }

  const rawStatusFilter = status?.trim() || null
  if (!isValidStatusFilter(rawStatusFilter)) {
    return { kind: 'error', status: 400, message: '无效的状态筛选' }
  }

  const statusFilter = normalizeStatusFilter(rawStatusFilter)
  const departmentIdFilter = departmentId ? Number(departmentId) : null
  const keywordFilter = keyword?.trim() || null

  const permUser = currentUser as unknown as PermissionUser

  const workItems = await findWorksForExport(
    buildWorkVisibilityWhere(permUser),
  )

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const rawStatusLower = rawStatusFilter?.toLowerCase() || null

  const visibleItems = workItems
    .filter((workItem) => canViewWorkItem(permUser, workItem))
    .filter((workItem) => !typeFilter || workItem.type === typeFilter)
    .filter((workItem) => {
      if (!rawStatusFilter || rawStatusFilter === 'all') return true
      if (rawStatusLower === 'draft') {
        return (
          workItem.status === WorkItemStatus.DRAFT &&
          !workItem.rejectReason &&
          !workItem.rejectedFromStatus
        )
      }
      if (
        rawStatusLower === 'returneddraft' ||
        rawStatusLower === 'returned_draft'
      ) {
        return (
          workItem.status === WorkItemStatus.DRAFT &&
          Boolean(workItem.rejectReason || workItem.rejectedFromStatus)
        )
      }
      if (
        rawStatusLower === 'pendingdecompose' ||
        rawStatusLower === 'pending_decompose'
      ) {
        return workItem.status === WorkItemStatus.PENDING_DECOMPOSE
      }
      if (rawStatusLower === 'approving')
        return APPROVING_STATUSES.includes(workItem.status)
      if (rawStatusLower === 'handling')
        return shouldHandleWorkItem(permUser, workItem)
      if (
        rawStatusLower === 'inprogress' ||
        rawStatusLower === 'in_progress'
      )
        return workItem.status === WorkItemStatus.IN_PROGRESS
      if (rawStatusLower === 'completed')
        return workItem.status === WorkItemStatus.COMPLETED
      if (rawStatusLower === 'cancelled')
        return workItem.status === WorkItemStatus.CANCELLED
      if (rawStatusLower === 'overdue')
        return isOverdueWork(workItem, now)
      if (rawStatusLower === 'expiring')
        return isExpiringWork(workItem, now)
      return !statusFilter || workItem.status === statusFilter
    })
    .filter((workItem) => keywordMatches(workItem, keywordFilter))
    .filter((workItem) => {
      if (!departmentIdFilter) return true
      return (
        getResponsibleDepartmentIds(workItem).includes(
          departmentIdFilter,
        ) ||
        getCooperatorDepartmentIds(workItem).includes(departmentIdFilter)
      )
    })

  const { buffer, fileName } = generateExportBuffer(visibleItems)

  createExportOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    visibleItemCount: visibleItems.length,
  })

  return {
    kind: 'ok',
    buffer,
    fileName,
    visibleItemCount: visibleItems.length,
  }
}
