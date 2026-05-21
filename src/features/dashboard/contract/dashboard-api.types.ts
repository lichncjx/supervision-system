import type { CompletionRateStat } from '@/shared/completion-rate.rules'
import type { DashboardData, DashboardSummary } from '@/features/dashboard/domain/dashboard.types'

export type DashboardDataResponse = DashboardData
export type DashboardSummaryResponse = DashboardSummary

export interface DashboardCompletionRateResponse {
  items: CompletionRateStat[]
  total: number
}

export interface DashboardApiErrorDto {
  error?: string
}
