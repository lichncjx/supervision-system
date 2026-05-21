import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { WorkItemType, type Prisma } from '@prisma/client'
import { getResponsibleDepartmentIds } from '@/features/works/domain/work.permissions'
import { buildWorkVisibilityWhere } from '@/shared/db/work-visibility-builder'
import { isDepartmentLevel, isGlobalView } from '@/features/users/domain/role.rules'
import { calculateDepartmentStats, type CompletionRateStat } from '@/shared/completion-rate.rules'
import {
  findWorksForDashboardCompletionRate,
  findDepartmentIdsFromVisibleWorks,
} from '@/features/dashboard/infrastructure/dashboard.repository'
import {
  findBusinessDepartments,
  findDepartmentById,
  findDepartmentsByIds,
  type Department,
} from '@/features/departments/infrastructure/department.repository'

export interface GetCompletionRateInput {
  currentUser: BaseCurrentUser
  type: string | null
  startDate: string | null
  endDate: string | null
}

export type GetCompletionRateResult =
  | {
      kind: 'ok'
      items: CompletionRateStat[]
      total: number
    }
  | { kind: 'error'; status: number; message: string }

async function getDepartmentStats(
  departmentId: number,
  departmentName: string,
  visibilityWhere: Prisma.WorkItemWhereInput,
  typeFilter?: WorkItemType,
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

  const visibilityWhere = await buildWorkVisibilityWhere(currentUser, false)

  const sDate = startDate ? new Date(startDate) : undefined
  const eDate = endDate ? new Date(endDate) : undefined
  const typeFilter = type && Object.values(WorkItemType).includes(type.toUpperCase() as WorkItemType)
    ? type.toUpperCase() as WorkItemType
    : undefined

  let departments: Department[]
  if (isGlobalView(currentUser.role)) {
    departments = await findBusinessDepartments()
  } else if (isDepartmentLevel(currentUser.role)) {
    const dept = await findDepartmentById(currentUser.departmentId)
    departments = dept ? [dept] : []
  } else {
    const ids = await findDepartmentIdsFromVisibleWorks(visibilityWhere)
    departments = ids.length > 0 ? await findDepartmentsByIds(ids) : []
  }

  const stats = await Promise.all(
    departments.map((dept) =>
      getDepartmentStats(
        dept.id,
        dept.name,
        visibilityWhere,
        typeFilter,
        sDate,
        eDate,
      ),
    ),
  )

  return { kind: 'ok', items: stats, total: stats.length }
}
