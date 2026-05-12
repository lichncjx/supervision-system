import { WorkItemStatus } from '@prisma/client'

export const EXPIRING_DAYS = 7

export const IN_PROGRESS_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.IN_PROGRESS,
]

export const COMPLETING_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETING,
]

export const COMPLETED_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETED,
]

export const CANCELLED_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.CANCELLED,
]

export const TERMINAL_STATUSES: WorkItemStatus[] = [
  ...COMPLETED_STATUSES,
  ...CANCELLED_STATUSES,
]

export const DEFAULT_LIST_LIMIT = 5
export const MAX_LIST_LIMIT = 100
