import { Prisma, WorkItemType } from '@prisma/client'
import { prisma } from '@/shared/db/prisma'
import { getResponsibleDepartmentIds } from '@/features/works/domain/work.permissions'

export const dashboardWorkSelect = {
  id: true,
  type: true,
  title: true,
  workItem: true,
  workNode: true,
  assessmentYear: true,
  status: true,
  action: true,
  completeTime: true,
  planCompleteTime: true,
  departmentId: true,
  cooperators: true,
  responsibleLeader: true,
  responsiblePerson: true,
  responsibleLeaderUserId: true,
  responsiblePersonUserId: true,
  rejectReason: true,
  rejectedFromStatus: true,
  beforeApprovalStatus: true,
  approvalType: true,
  creatorId: true,
  firstSubmitterId: true,
  proposedLeaderId: true,
  approvalLeaderId: true,
  currentApproverId: true,
  currentApproverRole: true,
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
  visibilityWhere: Prisma.WorkItemWhereInput
  assessmentYear: number
  typeFilter?: WorkItemType
}) {
  const filters: Prisma.WorkItemWhereInput[] = [
    params.visibilityWhere,
    { departmentId: params.departmentId },
  ]

  filters.push({ assessmentYear: params.assessmentYear })

  if (params.typeFilter) {
    filters.push({ type: params.typeFilter })
  }

  return prisma.workItem.findMany({
    where: { AND: filters },
  })
}

export async function findDepartmentIdsFromVisibleWorks(
  visibilityWhere: Prisma.WorkItemWhereInput,
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
