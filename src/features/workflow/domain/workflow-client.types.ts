export interface WorkflowStep {
  label: string
  status: 'done' | 'current' | 'pending' | 'returned'
}

export interface WorkflowRecord {
  id: number
  action: string
  initiatorId: number
  initiatorName: string
  initiatorRole: string
  previousStatus: string
  newStatus: string
  comment: string
  createdAt: string
}
