import { WorkItemType, WorkItemStatus } from '@prisma/client'
import { canViewWorkItem } from '@/features/works/domain/work.permissions'
import { canHandleWorkItem } from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import { buildWorksWhere } from '@/features/works/infrastructure/work.query-builder'
import {
  findManyWorks,
  type WorkListRow,
} from '@/features/works/infrastructure/work.repository'
import { toWorkListItems } from '@/features/works/presentation/work.presenter'
import type {
  QueryWorksInput,
  StatusFilter,
} from '@/features/works/presentation/work.dto'

const TERMINAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETED,
  WorkItemStatus.CANCELLED,
]

const EXPIRING_DAYS = 7

function getDueDate(work: {
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}) {
  return work.type === WorkItemType.TODO
    ? work.planCompleteTime
    : work.completeTime
}

function isOverdueWork(
  work: { type: WorkItemType; status: WorkItemStatus; completeTime: Date | null; planCompleteTime: Date | null },
  now: Date,
) {
  if (TERMINAL_STATUSES.includes(work.status)) return false
  const dueDate = getDueDate(work)
  return dueDate ? dueDate < now : false
}

function isExpiringWork(
  work: { type: WorkItemType; status: WorkItemStatus; completeTime: Date | null; planCompleteTime: Date | null },
  now: Date,
) {
  if (TERMINAL_STATUSES.includes(work.status)) return false
  const dueDate = getDueDate(work)
  if (!dueDate) return false
  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + EXPIRING_DAYS)
  return dueDate >= now && dueDate <= deadline
}

function applyPostFilter(
  works: WorkListRow[],
  statusFilter: StatusFilter,
  currentUser: PermissionUser,
): WorkListRow[] {
  if (statusFilter?.kind !== 'post') return works

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return works.filter((work) => {
    if (statusFilter.postFilter === 'handling')
      return canHandleWorkItem(currentUser, work)
    if (statusFilter.postFilter === 'overdue')
      return isOverdueWork(work, today)
    if (statusFilter.postFilter === 'expiring')
      return isExpiringWork(work, today)
    return true
  })
}

export async function queryWorksUseCase(input: QueryWorksInput) {
  const { currentUser, params } = input

  const { where, statusFilter } = buildWorksWhere(
    currentUser as PermissionUser,
    params,
  )

  const works = await findManyWorks(where)

  const viewableWorks = works.filter((work) =>
    canViewWorkItem(currentUser as PermissionUser, work),
  )

  const filteredWorks = applyPostFilter(
    viewableWorks,
    statusFilter,
    currentUser as PermissionUser,
  )

  return toWorkListItems(filteredWorks)
}
