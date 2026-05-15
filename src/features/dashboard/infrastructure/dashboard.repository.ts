import { Prisma } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'
import { getResponsibleDepartmentIds } from '@/features/works/domain/work.permissions'

export const dashboardWorkSelect = {
  id: true,
  type: true,
  title: true,
  status: true,
  action: true,
  completeTime: true,
  planCompleteTime: true,
  departmentId: true,
  cooperators: true,
  responsibleLeader: true,
  responsiblePerson: true,
  creatorId: true,
  firstSubmitterId: true,
  proposedLeaderId: true,
  approvalLeaderId: true,
  currentApproverId: true,
  currentApproverRole: true,
  needMainLeaderCancel: true,
  department: { select: { id: true, name: true } },
  currentApprover: { select: { id: true, name: true } },
} as const

export type DashboardWorkRow = Prisma.WorkItemGetPayload<{
  select: typeof dashboardWorkSelect
}>

export async function findDashboardWorks(
  where: Prisma.WorkItemWhereInput,
): Promise<DashboardWorkRow[]> {
  return prisma.workItem.findMany({
    where,
    select: dashboardWorkSelect,
  })
}

export async function findWorksForDashboardCompletionRate(params: {
  departmentId: number
  visibilityWhere: any
  dateFilter: Record<string, unknown>
  typeFilter?: string
}) {
  const filters: any[] = [
    params.visibilityWhere,
    { departmentId: params.departmentId },
  ]

  if (Object.keys(params.dateFilter).length > 0) {
    filters.push({ createdAt: params.dateFilter })
  }

  if (params.typeFilter) {
    filters.push({ type: params.typeFilter.toUpperCase() })
  }

  return prisma.workItem.findMany({
    where: { AND: filters },
  })
}

export async function findDepartmentIdsFromVisibleWorks(
  visibilityWhere: any,
): Promise<number[]> {
  const visibleWorks = await prisma.workItem.findMany({
    where: visibilityWhere,
    select: { departmentId: true },
  })

  return Array.from(
    new Set(
      visibleWorks.flatMap((work) =>
        getResponsibleDepartmentIds(work),
      ),
    ),
  )
}
