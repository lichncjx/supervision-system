import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { WorkItemStatus, WorkItemType } from '@prisma/client'
import { err, ok, type Result } from '@/shared/result'
import type { ExcelExportFile } from '@/features/excel/application/excel-export.types'

export interface ExportWorksToExcelInput {
  currentUser: BaseCurrentUser
  type: string | null
  status: string | null
  departmentId: string | null
  keyword: string | null
  assessmentYear: string | null
  workItem: string | null
  month: string | null
}

import {
  canViewWorkItem,
  shouldHandleWorkItem,
  getCooperatorDepartmentIds,
  getResponsibleDepartmentIds,
} from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { buildWorkVisibilityWhere } from '@/shared/db/work-visibility-builder'
import {
  findWorksForExport,
  createExportOperationLog,
} from '@/features/excel/infrastructure/excel-work.repository'
import { generateExportBuffer } from '@/features/excel/infrastructure/work-exporter'
import {
  isApproving,
  isOverdueWorkItem,
  isExpiringWorkItem,
} from '@/features/works/domain/work-status.rules'
import {
  normalizeAssessmentYear,
  normalizeWorkStructureText,
} from '@/features/works/domain/work-structure.rules'
import { matchesWorkKeyword } from '@/features/works/application/work-keyword-search'
import { getDefaultAssessmentYear } from '@/features/system-settings/application/system-settings.usecase'

export type ExportWorksToExcelDependencies = {
  getDefaultAssessmentYear: typeof getDefaultAssessmentYear
  findWorksForExport: typeof findWorksForExport
  buildWorkVisibilityWhere: typeof buildWorkVisibilityWhere
  generateExportBuffer: typeof generateExportBuffer
  createExportOperationLog: typeof createExportOperationLog
}

const defaultDependencies: ExportWorksToExcelDependencies = {
  getDefaultAssessmentYear,
  findWorksForExport,
  buildWorkVisibilityWhere,
  generateExportBuffer,
  createExportOperationLog,
}

function normalizeTypeFilter(type: string | null): WorkItemType | null {
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
  return Object.values(WorkItemStatus).includes(normalized as WorkItemStatus) ? normalized : null
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

export async function exportWorksToExcelUseCase(
  input: ExportWorksToExcelInput,
  dependencies: ExportWorksToExcelDependencies = defaultDependencies,
): Promise<Result<ExcelExportFile>> {
  const {
    currentUser,
    type,
    status,
    departmentId,
    keyword,
    assessmentYear,
    workItem,
    month,
  } = input

  const typeFilter = normalizeTypeFilter(type)
  if (type && !typeFilter) {
    return err(400, '无效的事项类型')
  }

  const rawStatusFilter = status?.trim() || null
  if (!isValidStatusFilter(rawStatusFilter)) {
    return err(400, '无效的状态筛选')
  }

  const statusFilter = normalizeStatusFilter(rawStatusFilter)
  const departmentIdFilter = departmentId ? Number(departmentId) : null
  const keywordFilter = keyword?.trim() || null
  const isAllYears = assessmentYear?.trim().toLowerCase() === 'all'
  const requestedAssessmentYearFilter = normalizeAssessmentYear(assessmentYear)
  if (assessmentYear && !requestedAssessmentYearFilter && !isAllYears) {
    return err(400, '无效的年度筛选条件')
  }

  const workItemFilter = normalizeWorkStructureText(workItem)
  if (workItem && (!typeFilter || !requestedAssessmentYearFilter || !workItemFilter)) {
    return err(400, '精确工作事项筛选必须同时指定类型和年度')
  }

  const assessmentYearFilter = requestedAssessmentYearFilter || (
    isAllYears ? null : await dependencies.getDefaultAssessmentYear()
  )

  const monthFilter = month?.trim() || null
  if (monthFilter && !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthFilter)) {
    return err(400, '无效的月份筛选条件')
  }

  const permUser = toPermissionUser(currentUser)

  const workItems = await dependencies.findWorksForExport(
    await dependencies.buildWorkVisibilityWhere(currentUser),
  )

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const rawStatusLower = rawStatusFilter?.toLowerCase() || null

  const visibleItems = workItems
    .filter((workItem) => canViewWorkItem(permUser, workItem))
    .filter((workItem) => !typeFilter || workItem.type === typeFilter)
    .filter(
      (workItem) =>
        !assessmentYearFilter || workItem.assessmentYear === assessmentYearFilter,
    )
    .filter((workItem) => !workItemFilter || workItem.workItem === workItemFilter)
    .filter((workItem) => {
      if (!rawStatusFilter || rawStatusFilter === 'all') return true
      if (rawStatusLower === 'draft') {
        return (
          workItem.status === WorkItemStatus.DRAFT &&
          !workItem.rejectReason &&
          !workItem.rejectedFromStatus
        )
      }
      if (rawStatusLower === 'returneddraft' || rawStatusLower === 'returned_draft') {
        return (
          workItem.status === WorkItemStatus.DRAFT &&
          Boolean(workItem.rejectReason || workItem.rejectedFromStatus)
        )
      }
      if (rawStatusLower === 'pendingdecompose' || rawStatusLower === 'pending_decompose') {
        return workItem.status === WorkItemStatus.PENDING_DECOMPOSE
      }
      if (rawStatusLower === 'approving') return isApproving(workItem.status)
      if (rawStatusLower === 'handling') return shouldHandleWorkItem(permUser, workItem)
      if (rawStatusLower === 'inprogress' || rawStatusLower === 'in_progress')
        return workItem.status === WorkItemStatus.IN_PROGRESS
      if (rawStatusLower === 'completed') return workItem.status === WorkItemStatus.COMPLETED
      if (rawStatusLower === 'cancelled') return workItem.status === WorkItemStatus.CANCELLED
      if (rawStatusLower === 'overdue') return isOverdueWorkItem(workItem, now)
      if (rawStatusLower === 'expiring') return isExpiringWorkItem(workItem, now)
      return !statusFilter || workItem.status === statusFilter
    })
    .filter((workItem) =>
      matchesWorkKeyword(
        {
          type: workItem.type,
          workItem: workItem.workItem,
          workNode: workItem.workNode,
          legacyTitle: workItem.title,
          additionalValues: [workItem.businessCategory],
        },
        keywordFilter,
      ),
    )
    .filter(
      (workItem) =>
        !monthFilter || workItem.planCompleteTime?.toISOString().slice(0, 7) === monthFilter,
    )
    .filter((workItem) => {
      if (!departmentIdFilter) return true
      return (
        getResponsibleDepartmentIds(workItem).includes(departmentIdFilter) ||
        getCooperatorDepartmentIds(workItem).includes(departmentIdFilter)
      )
    })

  const { buffer, fileName } = dependencies.generateExportBuffer(visibleItems)

  dependencies.createExportOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    visibleItemCount: visibleItems.length,
  })

  return ok({ buffer, fileName })
}
