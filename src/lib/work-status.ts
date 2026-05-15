export {
  CURRENT_WORK_STATUS_VALUES,
  WORK_STATUS_META,
  PENDING_APPROVAL_FILTER_STATUS_VALUES,
} from '@/features/works/domain/work-status'
export type {
  WorkStatus,
  WorkStatusVisualGroup,
  WorkStatusMeta,
} from '@/features/works/domain/work-status'

export {
  normalizeWorkStatus,
  getWorkStatusMeta,
  isReturnedDraftWork,
  isReturnedInProgressWork,
  getWorkStatusLabel,
  getWorkDisplayStatusLabel,
  getWorkStatusDescription,
  getWorkStatusBadgeClass,
  getWorkStatusVisualGroup,
  isCurrentWorkStatus,
  isLegacyWorkStatus,
  isWorkStatusTerminal,
  isWorkStatusApproving,
  isWorkStatusHandling,
  isWorkStatusInProgress,
  shouldCountWorkStatusForDeadline,
  isWorkStatusInPendingApprovalFilter,
} from '@/features/works/domain/work-status.rules'
export type { ReturnedDraftLike } from '@/features/works/domain/work-status.rules'
