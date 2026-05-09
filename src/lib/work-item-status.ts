import { WorkItemStatus, WorkItemType } from '@prisma/client'

export type TargetWorkItemStatus =
  | 'DRAFT'
  | 'PENDING_DECOMPOSE'
  | 'PROPOSING'
  | 'IN_PROGRESS'
  | 'ADJUSTING'
  | 'CANCELLING'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'CANCELLED'

export const TARGET_WORK_ITEM_STATUS_GROUPS: Record<TargetWorkItemStatus, WorkItemStatus[]> = {
  DRAFT: [WorkItemStatus.DRAFT, WorkItemStatus.REJECTED],
  PENDING_DECOMPOSE: [WorkItemStatus.PENDING_DECOMPOSE],
  PROPOSING: [WorkItemStatus.PENDING_DEPT, WorkItemStatus.PENDING_COMPANY],
  IN_PROGRESS: [WorkItemStatus.APPROVED, WorkItemStatus.IN_PROGRESS],
  ADJUSTING: [WorkItemStatus.ADJUSTING],
  CANCELLING: [WorkItemStatus.CANCELLING, WorkItemStatus.PENDING_MAIN_LEADER_CANCEL],
  COMPLETING: [
    WorkItemStatus.PENDING_COMPLETE,
    WorkItemStatus.PENDING_EVIDENCE_DEPT,
    WorkItemStatus.PENDING_EVIDENCE_COMPANY,
  ],
  COMPLETED: [WorkItemStatus.COMPLETED],
  CANCELLED: [WorkItemStatus.CANCELLED],
}

const TARGET_STATUS_BY_LEGACY = Object.fromEntries(
  Object.entries(TARGET_WORK_ITEM_STATUS_GROUPS).flatMap(([targetStatus, legacyStatuses]) =>
    legacyStatuses.map((legacyStatus) => [legacyStatus, targetStatus])
  )
) as Record<WorkItemStatus, TargetWorkItemStatus>

export function getTargetWorkItemStatus(status: WorkItemStatus): TargetWorkItemStatus {
  return (TARGET_STATUS_BY_LEGACY[status] ?? status) as TargetWorkItemStatus
}

export function isTargetInProgressStatus(status: WorkItemStatus): boolean {
  return getTargetWorkItemStatus(status) === 'IN_PROGRESS'
}

export function isTargetApprovalStatus(status: WorkItemStatus): boolean {
  return ['PROPOSING', 'ADJUSTING', 'CANCELLING', 'COMPLETING'].includes(
    getTargetWorkItemStatus(status)
  )
}

export function isTargetTerminalStatus(status: WorkItemStatus): boolean {
  const targetStatus = getTargetWorkItemStatus(status)
  return targetStatus === 'COMPLETED' || targetStatus === 'CANCELLED'
}

export function getWorkItemDueDate(workItem: {
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}): Date | null {
  return workItem.type === WorkItemType.TODO
    ? workItem.planCompleteTime
    : workItem.completeTime
}
