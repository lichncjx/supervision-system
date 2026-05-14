export type {
  WorkType,
  WorkStatusFilter,
  WorkQuery,
  Status,
  ActionType,
  WorkSubNode,
  WorkNode,
  AdjustHistory,
  Cooperator,
} from '@/features/works/domain/work-client.types'
export type { Work, WorkEditablePatch, WorkFilter } from '@/features/works/client/work-view.types'
export type { Attachment } from '@/features/attachments/domain/attachment-client.types'
export type { WorkflowStep, WorkflowRecord } from '@/features/workflow/domain/workflow-client.types'
export type { WorkStatusValue } from '@/lib/work-status'

export { getWorkStatusLabel as getStatusName } from '@/lib/work-status'
export { getWorkDisplayStatusLabel as getWorkDisplayStatusName } from '@/lib/work-status'
export { isWorkStatusInProgress as isInProgressStatus } from '@/lib/work-status'
export { isReturnedDraftWork as isReturnedDraft } from '@/lib/work-status'
export { isWorkStatusInPendingApprovalFilter as isPendingApprovalStatus } from '@/lib/work-status'
export {
  canHandleWork,
  canProcessWork,
  canApproveWork,
} from '@/features/works/client/work-client-permissions'
export { getActionName, getCurrentProcessDescription } from '@/features/works/client/work-display.utils'
export { getWorkDueDate, isOverdueWork, isExpiringWork } from '@/features/works/client/work-date.utils'
export { sortWorksByDueDate } from '@/features/works/client/work-sort'
export { isSupervisorTrackingWork } from '@/features/works/client/work-filters'
export {
  getWorkflowRecordDescription,
  getWorkflowSteps,
} from '@/features/workflow/client/workflow-display.utils'

export { transformWorkFromAPI } from '@/features/works/client/work-view-model'
export {
  getWorks,
  getVisibleWorks,
  getWorkById,
  queryWorks,
  addWork,
  updateWork,
  deleteWork,
  resubmitRejectedWork,
} from '@/features/works/client/work-api'
export {
  approveWork,
  rejectWork,
  submitComplete,
  submitAdjust,
  submitCancel,
  submitWork,
  submitTodoDecomposition,
  getWorkflowRecords,
} from '@/features/workflow/client/workflow-api'
export { getStats } from '@/features/dashboard/client/dashboard-api'
