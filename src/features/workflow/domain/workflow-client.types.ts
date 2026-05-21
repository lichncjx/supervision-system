export type { WorkflowRecordApiDto as WorkflowRecord } from '@/features/workflow/contract/workflow-api.types'

export interface WorkflowStep {
  label: string
  status: 'done' | 'current' | 'pending' | 'returned'
}
