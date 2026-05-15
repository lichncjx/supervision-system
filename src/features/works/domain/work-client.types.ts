import type { WorkStatusValue } from '@/lib/work-status'

export type WorkType = '重点' | '主要' | '待办'

export type WorkStatusFilter =
  | 'all'
  | 'draft'
  | 'returnedDraft'
  | 'pendingDecompose'
  | 'approving'
  | 'handling'
  | 'inProgress'
  | 'completed'
  | 'cancelled'
  | 'overdue'
  | 'expiring'

export interface WorkQuery {
  type?: WorkType | '全部'
  departmentId?: number | '全部'
  status?: WorkStatusFilter
  keyword?: string
}

export type Status = WorkStatusValue

export type ActionType =
  | 'create'
  | 'complete'
  | 'adjust'
  | 'cancel'
  | 'todo_decompose'

export interface WorkSubNode {
  id: number
  title: string
  completeTime?: string
}

export interface WorkNode {
  id: number
  title: string
  completeTime?: string
  children: WorkSubNode[]
}

export interface AdjustHistory {
  id: number
  reason: string
  field: 'planCompleteTime'
  fromTime?: string
  toTime?: string
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
}

export interface Cooperator {
  departmentId: number
  departmentName?: string
  leader?: string
  person?: string
}
