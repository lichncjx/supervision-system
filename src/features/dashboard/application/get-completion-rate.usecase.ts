import {
  buildWorkVisibilityWhere,
  getResponsibleDepartmentIds,
  isDepartmentLevelRole,
  isGlobalViewRole,
} from '@/lib/server-permissions'
import { calculateDepartmentStats } from '@/shared/completion-rate.rules'
import {
  findWorksForDashboardCompletionRate,
  findBusinessDepartments,
  findDepartmentById,
  findDepartmentIdsFromVisibleWorks,
  findDepartmentsByIds,
} from '@/features/dashboard/infrastructure/dashboard.repository'
import type {
  GetCompletionRateInput,
  GetCompletionRateResult,
} from '@/features/dashboard/presentation/dashboard.dto'
import type { CompletionRateStat } from '@/features/excel/presentation/excel.dto'

async function getDepartmentStats(
  departmentId: number,
  departmentName: string,
  visibilityWhere: any,
  typeFilter?: string,
  startDate?: Date,
  endDate?: Date,
): Promise<CompletionRateStat> {
  const dateFilter: Record<string, unknown> = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    dateFilter.lte = end
  }

  const works = await findWorksForDashboardCompletionRate({
    departmentId,
    visibilityWhere,
    dateFilter,
    typeFilter,
  })

  const responsibleWorks = works.filter((work) =>
    getResponsibleDepartmentIds(work).includes(departmentId),
  )

  const stats = calculateDepartmentStats(responsibleWorks)

  return { departmentId, departmentName, ...stats }
}

export async function getCompletionRateUseCase(
  input: GetCompletionRateInput,
): Promise<GetCompletionRateResult> {
  const { currentUser, type, startDate, endDate } = input

  const visibilityWhere = buildWorkVisibilityWhere(
    currentUser as unknown as Parameters<typeof buildWorkVisibilityWhere>[0],
  )

  const sDate = startDate ? new Date(startDate) : undefined
  const eDate = endDate ? new Date(endDate) : undefined

  let departments
  if (isGlobalViewRole(currentUser.role as any)) {
    departments = await findBusinessDepartments()
  } else if (isDepartmentLevelRole(currentUser.role as any)) {
    const dept = await findDepartmentById(currentUser.departmentId)
    departments = dept ? [dept] : []
  } else {
    const ids = await findDepartmentIdsFromVisibleWorks(visibilityWhere)
    departments = ids.length > 0 ? await findDepartmentsByIds(ids) : []
  }

  const stats = await Promise.all(
    departments.map((dept: any) =>
      getDepartmentStats(
        dept.id,
        dept.name,
        visibilityWhere,
        type || undefined,
        sDate,
        eDate,
      ),
    ),
  )

  return { kind: 'ok', items: stats, total: stats.length }
}
