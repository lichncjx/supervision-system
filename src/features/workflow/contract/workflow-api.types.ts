export type WorkflowActionApiType =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'evidence'
  | 'complete'
  | 'adjust'
  | 'cancel'
  | 'decompose'

export interface WorkflowActionRequest {
  action: WorkflowActionApiType
  comment?: string
  nextApproverId?: number | null
  rejectReason?: string
  proof?: string
  adjustReason?: string
  cancelReason?: string
  nodes?: unknown[]
}

export interface WorkflowActionResponse {
  success: true
  workItem: unknown
}

export interface WorkflowRecordApiDto {
  id: number
  action: string
  initiatorId: number
  initiatorName: string
  initiatorRole: string
  previousStatus: string
  newStatus: string
  comment: string | null
  createdAt: string
}

export type WorkflowRecordsResponse = WorkflowRecordApiDto[]

export interface WorkflowApiErrorDto {
  error?: string
}
