import { ApprovalType, WorkItemStatus } from '@prisma/client'

export const APPROVAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
]

export const APPROVAL_TARGET_STATUS: Record<ApprovalType, WorkItemStatus> = {
  [ApprovalType.PROPOSE]: WorkItemStatus.IN_PROGRESS,
  [ApprovalType.ADJUST]: WorkItemStatus.IN_PROGRESS,
  [ApprovalType.CANCEL]: WorkItemStatus.CANCELLED,
  [ApprovalType.COMPLETE]: WorkItemStatus.COMPLETED,
}
