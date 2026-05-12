import { Prisma, WorkItemType } from '@prisma/client'
import { buildWorkVisibilityWhere } from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import type { StatusFilter, QueryWorksParams } from '@/features/works/application/query-works.usecase'

export function buildWorksWhere(
  currentUser: PermissionUser,
  workType: WorkItemType | null,
  statusFilter: StatusFilter,
  params: QueryWorksParams,
): { where: Prisma.WorkItemWhereInput; statusFilter: StatusFilter } {
  const filters: Prisma.WorkItemWhereInput[] = [
    buildWorkVisibilityWhere(currentUser),
  ]

  if (workType) {
    filters.push({ type: workType })
  }

  if (statusFilter?.kind === 'where' || statusFilter?.kind === 'post') {
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
