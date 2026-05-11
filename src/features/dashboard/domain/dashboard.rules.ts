import { WorkItemType } from '@prisma/client'
import {
  canApproveWorkItem,
  canHandleWorkItem,
  type PermissionUser,
} from '@/features/works/domain/work.permissions'
import { normalizeWorkStatus, getWorkStatusLabel } from '@/lib/work-status'
import {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  TERMINAL_STATUSES,
  EXPIRING_DAYS,
  IN_PROGRESS_STATUSES,
  COMPLETING_STATUSES,
  COMPLETED_STATUSES,
  CANCELLED_STATUSES,
} from './dashboard.constants'
import type { DashboardSummary, WorkDashboardItem } from './dashboard.types'

export function normalizeLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIST_LIMIT
  return Math.min(Math.max(Math.trunc(Number(limit)), 1), MAX_LIST_LIMIT)
}

export function serializeDate(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

export function getWorkDueDate(workItem: {
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}): Date | null {
  return workItem.type === WorkItemType.TODO
    ? workItem.planCompleteTime
    : workItem.completeTime
}

export function isOverdueWorkItem(
  workItem: { status: any; completeTime: Date | null; planCompleteTime: Date | null; type: WorkItemType },
  now: Date,
): boolean {
  if (TERMINAL_STATUSES.includes(workItem.status as any)) return false
  const dueDate = getWorkDueDate(workItem)
  return dueDate ? dueDate < now : false
}

export function isExpiringWorkItem(
  workItem: { status: any; completeTime: Date | null; planCompleteTime: Date | null; type: WorkItemType },
  now: Date,
): boolean {
  if (TERMINAL_STATUSES.includes(workItem.status as any)) return false
  const dueDate = getWorkDueDate(workItem)
  if (!dueDate) return false
  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + EXPIRING_DAYS)
  return dueDate >= now && dueDate <= deadline
}

export function getTypeLabel(type: WorkItemType): string {
  if (type === WorkItemType.PRIORITY) return '重点工作'
  if (type === WorkItemType.MAIN) return '主要工作'
  return '待办事项'
}

export function getActionType(
  user: PermissionUser,
  workItem: any,
): WorkDashboardItem['actionType'] {
  if (canApproveWorkItem(user, workItem)) return 'approval'
  if (canHandleWorkItem(user, workItem)) return 'handling'
  return 'view'
}

export function parseCooperators(
  value: unknown,
): Array<{ departmentId: number; departmentName?: string; leader?: string; person?: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((item: any) => ({
      departmentId: Number(item?.departmentId) || 0,
      departmentName: item?.departmentName || undefined,
      leader: item?.leader || undefined,
      person: item?.person || undefined,
    }))
    .filter((c) => c.departmentId > 0)
}

export function toDashboardItem(
  user: PermissionUser,
  workItem: any,
  now: Date,
): WorkDashboardItem {
  const dueDate = getWorkDueDate(workItem)
  const status =
    normalizeWorkStatus(workItem.status) || String(workItem.status).toLowerCase()

  return {
    id: workItem.id,
    title: workItem.title,
    type: workItem.type,
    typeLabel: getTypeLabel(workItem.type),
    status,
    statusLabel: getWorkStatusLabel(workItem.status),
    departmentName: workItem.department?.name || null,
    responsibleLeader: workItem.responsibleLeader || null,
    responsiblePerson: workItem.responsiblePerson || null,
    cooperators: parseCooperators(workItem.cooperators),
    completeTime: serializeDate(workItem.completeTime),
    planCompleteTime: serializeDate(workItem.planCompleteTime),
    dueTime: serializeDate(dueDate),
    isOverdue: isOverdueWorkItem(workItem, now),
    isExpiring: isExpiringWorkItem(workItem, now),
    actionType: getActionType(user, workItem),
    currentApproverName: workItem.currentApprover?.name || null,
  }
}

export function compareDueDate(a: any, b: any): number {
  const aDue = getWorkDueDate(a)?.getTime()
  const bDue = getWorkDueDate(b)?.getTime()
  if (aDue == null && bDue == null) return a.id - b.id
  if (aDue == null) return 1
  if (bDue == null) return -1
  return aDue - bDue || a.id - b.id
}

export function sortExpiringAndOverdue(works: any[], now: Date) {
  return [...works].sort((a, b) => {
    const aOverdue = isOverdueWorkItem(a, now)
    const bOverdue = isOverdueWorkItem(b, now)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
    return compareDueDate(a, b)
  })
}

export function actionPriority(user: PermissionUser, work: any): number {
  if (canApproveWorkItem(user, work)) return 0
  if (canHandleWorkItem(user, work)) return 1
  return 2
}

export function sortMyActionRequired(
  user: PermissionUser,
  works: any[],
  now: Date,
) {
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

export function buildSummary(
  user: PermissionUser,
  visibleWorks: any[],
  now: Date,
): DashboardSummary {
  const priorityWorks = visibleWorks.filter((w) => w.type === WorkItemType.PRIORITY)
  const mainWorks = visibleWorks.filter((w) => w.type === WorkItemType.MAIN)
  const todoWorks = visibleWorks.filter((w) => w.type === WorkItemType.TODO)
  const completedWorks = visibleWorks.filter((w) => COMPLETED_STATUSES.includes(w.status as any))
  const pendingApprovalWorks = visibleWorks.filter((w) => canApproveWorkItem(user, w))
  const pendingHandlingWorks = visibleWorks.filter((w) => canHandleWorkItem(user, w))
  const expiringWorks = visibleWorks.filter((w) => isExpiringWorkItem(w, now))
  const overdueWorks = visibleWorks.filter((w) => isOverdueWorkItem(w, now))

  const pendingApprovalCount = pendingApprovalWorks.length
  const pendingHandlingCount = pendingHandlingWorks.length
  const inProgressCount = visibleWorks.filter((w) => IN_PROGRESS_STATUSES.includes(w.status as any)).length
  const completingCount = visibleWorks.filter((w) => COMPLETING_STATUSES.includes(w.status as any)).length
  const completedCount = completedWorks.length
  const cancelledCount = visibleWorks.filter((w) => CANCELLED_STATUSES.includes(w.status as any)).length
  const expiringCount = expiringWorks.length
  const overdueCount = overdueWorks.length

  return {
    total: visibleWorks.length,
    priorityTotal: priorityWorks.length,
    mainTotal: mainWorks.length,
    todoTotal: todoWorks.length,
    priorityCompleted: priorityWorks.filter((w) => completedWorks.includes(w)).length,
    mainCompleted: mainWorks.filter((w) => completedWorks.includes(w)).length,
    todoCompleted: todoWorks.filter((w) => completedWorks.includes(w)).length,
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
