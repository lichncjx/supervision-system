import { WorkItemStatus, WorkItemType, type Department, type Role } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
  buildWorkVisibilityWhere,
  canApproveWorkItem,
  canHandleWorkItem,
  canViewWorkItem,
  getCooperateDepartmentIds,
  getResponsibleDepartmentIds,
  type PermissionUser,
} from '@/lib/server-permissions'
import { getWorkStatusLabel, normalizeWorkStatus } from '@/lib/work-status'

const EXPIRING_DAYS = 7

const IN_PROGRESS_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.IN_PROGRESS,
]

const COMPLETING_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETING,
]

const COMPLETED_STATUSES: WorkItemStatus[] = [WorkItemStatus.COMPLETED]
const CANCELLED_STATUSES: WorkItemStatus[] = [WorkItemStatus.CANCELLED]
const TERMINAL_STATUSES: WorkItemStatus[] = [
  ...COMPLETED_STATUSES,
  ...CANCELLED_STATUSES,
]

const DEFAULT_LIST_LIMIT = 5
const MAX_LIST_LIMIT = 100

const dashboardWorkSelect = {
  id: true,
  type: true,
  title: true,
  status: true,
  action: true,
  completeTime: true,
  planCompleteTime: true,
  departmentId: true,
  departmentIds: true,
  cooperateDepartmentIds: true,
  creatorId: true,
  firstSubmitterId: true,
  proposedLeaderId: true,
  approvalLeaderId: true,
  currentApproverId: true,
  currentApproverRole: true,
  needMainLeaderCancel: true,
  deptManagerId: true,
  department: { select: { id: true, name: true } },
  currentApprover: { select: { id: true, name: true } },
} as const

type DashboardWork = {
  id: number
  type: WorkItemType
  title: string
  status: WorkItemStatus
  action: unknown
  completeTime: Date | null
  planCompleteTime: Date | null
  departmentId: number | null
  departmentIds: number[]
  cooperateDepartmentIds: number[]
  creatorId: number | null
  firstSubmitterId: number | null
  proposedLeaderId: number | null
  approvalLeaderId: number | null
  currentApproverId: number | null
  currentApproverRole: Role | null
  needMainLeaderCancel: boolean | null
  deptManagerId: number | null
  department: Pick<Department, 'id' | 'name'> | null
  currentApprover: { id: number; name: string } | null
}

export interface DashboardSummary {
  total: number
  priorityTotal: number
  mainTotal: number
  todoTotal: number
  priorityCompleted: number
  mainCompleted: number
  todoCompleted: number
  pendingApprovalCount: number
  pendingHandlingCount: number
  myActionRequiredCount: number
  inProgressCount: number
  completingCount: number
  completedCount: number
  cancelledCount: number
  expiringCount: number
  overdueCount: number
  approving: number
  handling: number
  inProgress: number
  completing: number
  completed: number
  cancelled: number
  expiring: number
  overdue: number
  thisMonthDue: number
}

export interface WorkDashboardItem {
  id: number
  title: string
  type: WorkItemType
  typeLabel: string
  status: string
  statusLabel: string
  departmentName: string | null
  departmentNames: string[]
  responsibleDepartmentNames: string[]
  cooperateDepartmentNames: string[]
  completeTime: string | null
  planCompleteTime: string | null
  dueTime: string | null
  isOverdue: boolean
  isExpiring: boolean
  actionType: 'approval' | 'handling' | 'view'
  currentApproverName: string | null
}

export interface DashboardData {
  summary: DashboardSummary
  lists: {
    expiringAndOverdue: WorkDashboardItem[]
    myActionRequired: WorkDashboardItem[]
  }
}

export interface DashboardDataOptions {
  limit?: number
}

function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIST_LIMIT
  return Math.min(Math.max(Math.trunc(Number(limit)), 1), MAX_LIST_LIMIT)
}

function serializeDate(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

function getWorkDueDate(workItem: {
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}): Date | null {
  return workItem.type === WorkItemType.TODO
    ? workItem.planCompleteTime
    : workItem.completeTime
}

function isOverdueWorkItem(workItem: DashboardWork, now: Date): boolean {
  if (TERMINAL_STATUSES.includes(workItem.status)) return false

  const dueDate = getWorkDueDate(workItem)
  return dueDate ? dueDate < now : false
}

function isExpiringWorkItem(workItem: DashboardWork, now: Date): boolean {
  if (TERMINAL_STATUSES.includes(workItem.status)) return false

  const dueDate = getWorkDueDate(workItem)
  if (!dueDate) return false

  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + EXPIRING_DAYS)

  return dueDate >= now && dueDate <= deadline
}

function getTypeLabel(type: WorkItemType): string {
  if (type === WorkItemType.PRIORITY) return '重点工作'
  if (type === WorkItemType.MAIN) return '主要工作'
  return '待办事项'
}

function getActionType(
  user: PermissionUser,
  workItem: DashboardWork,
): WorkDashboardItem['actionType'] {
  if (canApproveWorkItem(user, workItem)) return 'approval'
  if (canHandleWorkItem(user, workItem)) return 'handling'
  return 'view'
}

function getDepartmentNameMap(works: DashboardWork[]): Promise<Map<number, string>> {
  const ids = new Set<number>()
  for (const work of works) {
    for (const id of [
      ...getResponsibleDepartmentIds(work),
      ...getCooperateDepartmentIds(work),
    ]) {
      ids.add(id)
    }
  }

  if (ids.size === 0) return Promise.resolve(new Map())

  return prisma.department
    .findMany({
      where: { id: { in: Array.from(ids) } },
      select: { id: true, name: true },
    })
    .then((departments) =>
      new Map(departments.map((department) => [department.id, department.name]))
    )
}

function departmentNames(ids: number[], nameById: Map<number, string>): string[] {
  return ids
    .map((id) => nameById.get(id))
    .filter((name): name is string => Boolean(name))
}

function toDashboardItem(
  user: PermissionUser,
  workItem: DashboardWork,
  nameById: Map<number, string>,
  now: Date,
): WorkDashboardItem {
  const responsibleDepartmentNames = departmentNames(
    getResponsibleDepartmentIds(workItem),
    nameById,
  )
  const cooperateDepartmentNames = departmentNames(
    getCooperateDepartmentIds(workItem),
    nameById,
  )
  const dueDate = getWorkDueDate(workItem)
  const status = normalizeWorkStatus(workItem.status) || String(workItem.status).toLowerCase()

  return {
    id: workItem.id,
    title: workItem.title,
    type: workItem.type,
    typeLabel: getTypeLabel(workItem.type),
    status,
    statusLabel: getWorkStatusLabel(workItem.status),
    departmentName: workItem.department?.name || null,
    departmentNames: responsibleDepartmentNames,
    responsibleDepartmentNames,
    cooperateDepartmentNames,
    completeTime: serializeDate(workItem.completeTime),
    planCompleteTime: serializeDate(workItem.planCompleteTime),
    dueTime: serializeDate(dueDate),
    isOverdue: isOverdueWorkItem(workItem, now),
    isExpiring: isExpiringWorkItem(workItem, now),
    actionType: getActionType(user, workItem),
    currentApproverName: workItem.currentApprover?.name || null,
  }
}

function compareDueDate(a: DashboardWork, b: DashboardWork): number {
  const aDue = getWorkDueDate(a)?.getTime()
  const bDue = getWorkDueDate(b)?.getTime()
  if (aDue == null && bDue == null) return a.id - b.id
  if (aDue == null) return 1
  if (bDue == null) return -1
  return aDue - bDue || a.id - b.id
}

function sortExpiringAndOverdue(works: DashboardWork[], now: Date): DashboardWork[] {
  return [...works].sort((a, b) => {
    const aOverdue = isOverdueWorkItem(a, now)
    const bOverdue = isOverdueWorkItem(b, now)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    return compareDueDate(a, b)
  })
}

function actionPriority(user: PermissionUser, work: DashboardWork): number {
  if (canApproveWorkItem(user, work)) return 0
  if (canHandleWorkItem(user, work)) return 1
  return 2
}

function sortMyActionRequired(
  user: PermissionUser,
  works: DashboardWork[],
  now: Date,
): DashboardWork[] {
  return [...works].sort((a, b) => {
    const aOverdue = isOverdueWorkItem(a, now)
    const bOverdue = isOverdueWorkItem(b, now)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

    const aExpiring = isExpiringWorkItem(a, now)
    const bExpiring = isExpiringWorkItem(b, now)
    if (aExpiring !== bExpiring) return aExpiring ? -1 : 1

    const actionDiff = actionPriority(user, a) - actionPriority(user, b)
    if (actionDiff !== 0) return actionDiff

    return compareDueDate(a, b)
  })
}

function buildSummary(
  user: PermissionUser,
  visibleWorks: DashboardWork[],
  now: Date,
): DashboardSummary {
  const priorityWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.PRIORITY)
  const mainWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.MAIN)
  const todoWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.TODO)
  const completedWorks = visibleWorks.filter((workItem) =>
    COMPLETED_STATUSES.includes(workItem.status)
  )
  const pendingApprovalWorks = visibleWorks.filter((workItem) =>
    canApproveWorkItem(user, workItem)
  )
  const pendingHandlingWorks = visibleWorks.filter((workItem) =>
    canHandleWorkItem(user, workItem)
  )
  const expiringWorks = visibleWorks.filter((workItem) =>
    isExpiringWorkItem(workItem, now)
  )
  const overdueWorks = visibleWorks.filter((workItem) =>
    isOverdueWorkItem(workItem, now)
  )

  const pendingApprovalCount = pendingApprovalWorks.length
  const pendingHandlingCount = pendingHandlingWorks.length
  const inProgressCount = visibleWorks.filter((workItem) =>
    IN_PROGRESS_STATUSES.includes(workItem.status)
  ).length
  const completingCount = visibleWorks.filter((workItem) =>
    COMPLETING_STATUSES.includes(workItem.status)
  ).length
  const completedCount = completedWorks.length
  const cancelledCount = visibleWorks.filter((workItem) =>
    CANCELLED_STATUSES.includes(workItem.status)
  ).length
  const expiringCount = expiringWorks.length
  const overdueCount = overdueWorks.length

  return {
    total: visibleWorks.length,
    priorityTotal: priorityWorks.length,
    mainTotal: mainWorks.length,
    todoTotal: todoWorks.length,
    priorityCompleted: priorityWorks.filter((workItem) => completedWorks.includes(workItem)).length,
    mainCompleted: mainWorks.filter((workItem) => completedWorks.includes(workItem)).length,
    todoCompleted: todoWorks.filter((workItem) => completedWorks.includes(workItem)).length,
    pendingApprovalCount,
    pendingHandlingCount,
    myActionRequiredCount: pendingApprovalCount + pendingHandlingCount,
    inProgressCount,
    completingCount,
    completedCount,
    cancelledCount,
    expiringCount,
    overdueCount,
    approving: pendingApprovalCount,
    handling: pendingHandlingCount,
    inProgress: inProgressCount,
    completing: completingCount,
    completed: completedCount,
    cancelled: cancelledCount,
    expiring: expiringCount,
    overdue: overdueCount,
    thisMonthDue: expiringCount,
  }
}

export async function getDashboardData(
  user: PermissionUser,
  options: DashboardDataOptions = {},
): Promise<DashboardData> {
  const limit = normalizeLimit(options.limit)
  const whereClause = buildWorkVisibilityWhere(user)
  const allRelevantWorks = await prisma.workItem.findMany({
    where: whereClause,
    select: dashboardWorkSelect,
  })
  const visibleWorks = allRelevantWorks.filter((workItem) =>
    canViewWorkItem(user, workItem)
  ) as DashboardWork[]
  const now = new Date()
  const nameById = await getDepartmentNameMap(visibleWorks)
  const summary = buildSummary(user, visibleWorks, now)

  const expiringAndOverdue = sortExpiringAndOverdue(
    visibleWorks.filter(
      (workItem) =>
        isExpiringWorkItem(workItem, now) || isOverdueWorkItem(workItem, now),
    ),
    now,
  )
    .slice(0, limit)
    .map((workItem) => toDashboardItem(user, workItem, nameById, now))

  const myActionRequired = sortMyActionRequired(
    user,
    visibleWorks.filter(
      (workItem) =>
        canApproveWorkItem(user, workItem) || canHandleWorkItem(user, workItem),
    ),
    now,
  )
    .slice(0, limit)
    .map((workItem) => toDashboardItem(user, workItem, nameById, now))

  return {
    summary,
    lists: {
      expiringAndOverdue,
      myActionRequired,
    },
  }
}

export async function getDashboardSummary(user: PermissionUser): Promise<DashboardSummary> {
  const data = await getDashboardData(user, { limit: 1 })
  return data.summary
}
