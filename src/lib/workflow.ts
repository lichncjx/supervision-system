export type { UserSession, WorkflowResult } from '@/features/workflow/domain/workflow.types'
export {
  canUserApprove,
  canUserSubmit,
} from '@/features/workflow/domain/workflow.rules'

export {
  submitProposal as submitForApproval,
} from '@/features/workflow/application/submit-proposal.usecase'

export {
  submitCompletion as submitEvidence,
} from '@/features/workflow/application/submit-completion.usecase'

export {
  approveWorkflowAction as approveWorkItem,
} from '@/features/workflow/application/approve-workflow-action.usecase'

export {
  rejectWorkflowAction as rejectWorkItem,
} from '@/features/workflow/application/reject-workflow-action.usecase'

export {
  submitAdjustment as submitAdjust,
} from '@/features/workflow/application/submit-adjustment.usecase'

export {
  submitCancellation as submitCancel,
} from '@/features/workflow/application/submit-cancellation.usecase'

export {
  decomposeTodoWork as decomposeTodo,
} from '@/features/workflow/application/decompose-todo-work.usecase'

export { getWorkflowRecords } from '@/features/workflow/application/get-workflow-records.usecase'
