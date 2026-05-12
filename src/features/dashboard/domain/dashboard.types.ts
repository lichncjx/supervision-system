import type { WorkItemType } from '@prisma/client'

export interface DashboardSummary {
  total: number
  priorityTotal: number
  mainTotal: number
  todoTotal: number
  priorityCompleted: number
  mainCompleted: number
  todoCompleted: number
  pendingApprovalCount: number
  pendingHandlingCount: number
  myActionRequiredCount: number
  inProgressCount: number
  completingCount: number
  completedCount: number
  cancelledCount: number
  expiringCount: number
  overdueCount: number
  approving: number
  handling: number
  inProgress: number
  completing: number
  completed: number
  cancelled: number
  expiring: number
  overdue: number
  thisMonthDue: number
}

export interface WorkDashboardItem {
  id: number
  title: string
  type: WorkItemType
  typeLabel: string
  status: string
  statusLabel: string
  departmentName: string | null
  responsibleLeader: string | null
  responsiblePerson: string | null
  cooperators: Array<{
    departmentId: number
    departmentName?: string
    leader?: string
    person?: string
  }>
  completeTime: string | null
  planCompleteTime: string | null
  dueTime: string | null
  isOverdue: boolean
  isExpiring: boolean
  actionType: 'approval' | 'handling' | 'view'
  currentApproverName: string | null
}

export interface DashboardData {
  summary: DashboardSummary
  lists: {
    expiringAndOverdue: WorkDashboardItem[]
    myActionRequired: WorkDashboardItem[]
  }
}

export interface DashboardDataOptions {
  limit?: number
}
