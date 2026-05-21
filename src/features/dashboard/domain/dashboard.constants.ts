import { WorkItemStatus } from '@prisma/client'

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

export const DEFAULT_LIST_LIMIT = 5
export const MAX_LIST_LIMIT = 100
