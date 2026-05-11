import type { DashboardData, DashboardSummary } from '@/features/dashboard/domain/dashboard.types'
import type { DashboardDataOptions } from '@/features/dashboard/domain/dashboard.types'

export type GetDashboardDataInput = {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  options?: DashboardDataOptions
}

export type GetDashboardDataResult = DashboardData

export type GetDashboardSummaryInput = {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
}

export type GetDashboardSummaryResult = DashboardSummary

export interface GetCompletionRateInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  type: string | null
  startDate: string | null
  endDate: string | null
}

export type GetCompletionRateResult =
  | {
      kind: 'ok'
      items: import('@/features/excel/presentation/excel.dto').CompletionRateStat[]
      total: number
    }
  | { kind: 'error'; status: number; message: string }
