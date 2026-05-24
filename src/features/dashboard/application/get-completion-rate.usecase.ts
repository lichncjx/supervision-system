import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { WorkItemType, type Prisma } from '@prisma/client'
import { err, ok, type Result } from '@/shared/result'
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

function normalizeTypeFilter(type: string | null): WorkItemType | undefined {
  if (!type) return undefined

  const normalized = type.toUpperCase()
  if (!Object.values(WorkItemType).includes(normalized as WorkItemType)) {
    return undefined
  }

  return normalized as WorkItemType
}

export async function getCompletionRateUseCase(
  input: GetCompletionRateInput,
): Promise<Result<CompletionRateStat[]>> {
  const { currentUser, type, startDate, endDate } = input

  const visibilityWhere = await buildWorkVisibilityWhere(currentUser, false)

  const sDate = startDate ? new Date(startDate) : undefined
  const eDate = endDate ? new Date(endDate) : undefined
  const typeFilter = normalizeTypeFilter(type)
  if (type && !typeFilter) {
    return err(400, '无效的事项类型')
  }

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

  return ok(stats)
}
