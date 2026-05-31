import {
  WORK_STATUS_META,
  PRISMA_WORK_STATUS_TO_VALUE,
} from './work-status'
import type { WorkStatus } from './work-status'

export interface ReturnedDraftLike {
  status?: unknown
  rejectReason?: unknown
  rejectedFromStatus?: unknown
  workflowRecords?: Array<{
    action?: unknown
    actionType?: unknown
  }>
}

export const WORK_EXPIRING_DAYS = 7

export interface DeadlineWorkLike {
  status?: unknown
  planCompleteTime?: Date | string | null
}

function hasValue(value: unknown): boolean {
  if (value == null) return false
  return String(value).trim().length > 0
}

export function getWorkDueDate(workItem: DeadlineWorkLike): Date | null {
  const value = workItem.planCompleteTime
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

export function isOverdueWorkItem(
  workItem: DeadlineWorkLike,
  now: Date,
): boolean {
  if (isTerminal(workItem.status)) return false

  const dueDate = getWorkDueDate(workItem)
  return dueDate ? dueDate < now : false
}

export function isExpiringWorkItem(
  workItem: DeadlineWorkLike,
  now: Date,
): boolean {
  if (isTerminal(workItem.status)) return false

  const dueDate = getWorkDueDate(workItem)
  if (!dueDate) return false

  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + WORK_EXPIRING_DAYS)
  return dueDate >= now && dueDate <= deadline
}

export function normalizeWorkStatus(status: unknown): WorkStatus | undefined {
  if (typeof status !== 'string') return undefined

  const trimmed = status.trim()
  if (!trimmed) return undefined

  const lower = trimmed.toLowerCase() as WorkStatus
  if (lower in WORK_STATUS_META) {
    return lower
  }

  return PRISMA_WORK_STATUS_TO_VALUE[trimmed.toUpperCase()]
}

export function getWorkStatusMeta(status: unknown) {
  const normalized = normalizeWorkStatus(status)
  return normalized ? WORK_STATUS_META[normalized] : undefined
}

export function isReturnedDraftWork(
  work: ReturnedDraftLike | null | undefined,
): boolean {
  if (!work || normalizeWorkStatus(work.status) !== 'draft') return false

  if (
    hasValue(work.rejectReason) ||
    hasValue(work.rejectedFromStatus)
  ) {
    return true
  }

  const latestRecord = Array.isArray(work.workflowRecords)
    ? work.workflowRecords[0]
    : null
  const latestAction = String(
    latestRecord?.action || latestRecord?.actionType || '',
  ).toLowerCase()
  return latestAction === 'reject' || latestAction === 'rejected'
}

export function isReturnedInProgressWork(
  work: ReturnedDraftLike | null | undefined,
): boolean {
  if (!work || normalizeWorkStatus(work.status) !== 'in_progress') return false

  if (
    hasValue(work.rejectReason) ||
    hasValue(work.rejectedFromStatus)
  ) {
    return true
  }

  const latestRecord = Array.isArray(work.workflowRecords)
    ? work.workflowRecords[0]
    : null
  const latestAction = String(
    latestRecord?.action || latestRecord?.actionType || '',
  ).toLowerCase()
  return latestAction === 'reject' || latestAction === 'rejected'
}

export function getWorkStatusLabel(status: unknown): string {
  return getWorkStatusMeta(status)?.label || String(status)
}

export function getWorkDisplayStatusLabel(
  status: unknown,
  work?: ReturnedDraftLike,
): string {
  if (isReturnedDraftWork({ ...work, status })) {
    return '退回待修改'
  }
  return getWorkStatusLabel(status)
}

export function getWorkStatusDescription(status: unknown): string {
  return getWorkStatusMeta(status)?.description || String(status)
}

export function getWorkStatusBadgeClass(status: unknown): string {
  return (
    getWorkStatusMeta(status)?.badgeClass || WORK_STATUS_META.draft.badgeClass
  )
}

export function isTerminal(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isTerminal)
}

export function isApproving(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isApproving)
}

export function isHandling(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isHandling)
}

export function isInProgress(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isInProgress)
}

export function shouldCountForDeadline(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.countsForDeadline)
}
