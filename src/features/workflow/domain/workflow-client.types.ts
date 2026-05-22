export interface WorkflowStep {
  label: string
  status: 'done' | 'current' | 'pending' | 'returned'
}
