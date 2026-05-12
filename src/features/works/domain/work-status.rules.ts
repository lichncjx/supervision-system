import {
  WORK_STATUS_META,
  ALL_WORK_STATUS_META,
  PRISMA_WORK_STATUS_TO_VALUE,
  PENDING_APPROVAL_FILTER_STATUS_VALUES,
} from './work-status'
import type { WorkStatusValue, WorkStatusVisualGroup, CurrentWorkStatusValue } from './work-status'

export interface ReturnedDraftLike {
  status?: unknown
  rejectReason?: unknown
  rejectedFromStatus?: unknown
  rejectedAt?: unknown
  workflowRecords?: Array<{
    action?: unknown
    actionType?: unknown
  }>
}

function hasValue(value: unknown): boolean {
  if (value == null) return false
  return String(value).trim().length > 0
}

export function normalizeWorkStatus(status: unknown): WorkStatusValue | undefined {
  if (typeof status !== 'string') return undefined

  const trimmed = status.trim()
  if (!trimmed) return undefined

  const lower = trimmed.toLowerCase() as WorkStatusValue
  if (lower in ALL_WORK_STATUS_META) {
    return lower
  }

  return PRISMA_WORK_STATUS_TO_VALUE[trimmed.toUpperCase()]
}

export function getWorkStatusMeta(status: unknown) {
  const normalized = normalizeWorkStatus(status)
  return normalized ? ALL_WORK_STATUS_META[normalized] : undefined
}

export function isReturnedDraftWork(
  work: ReturnedDraftLike | null | undefined,
): boolean {
  if (!work || normalizeWorkStatus(work.status) !== 'draft') return false

  if (
    hasValue(work.rejectReason) ||
    hasValue(work.rejectedFromStatus) ||
    hasValue(work.rejectedAt)
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

export function getWorkStatusVisualGroup(
  status: unknown,
): WorkStatusVisualGroup {
  return (
    getWorkStatusMeta(status)?.visualGroup ||
    WORK_STATUS_META.cancelled.visualGroup
  )
}

export function isCurrentWorkStatus(
  status: unknown,
): status is CurrentWorkStatusValue {
  return Boolean(normalizeWorkStatus(status))
}

export function isLegacyWorkStatus(_status: unknown): _status is never {
  return false
}

export function isWorkStatusTerminal(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isTerminal)
}

export function isWorkStatusApproving(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isApproving)
}

export function isWorkStatusHandling(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isHandling)
}

export function isWorkStatusInProgress(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isInProgress)
}

export function shouldCountWorkStatusForDeadline(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.countsForDeadline)
}

export function isWorkStatusInPendingApprovalFilter(status: unknown): boolean {
  const normalized = normalizeWorkStatus(status)
  return Boolean(
    normalized &&
      (PENDING_APPROVAL_FILTER_STATUS_VALUES as readonly WorkStatusValue[]).includes(
        normalized,
      ),
  )
}
