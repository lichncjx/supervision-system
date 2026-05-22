import type { CompletionRateStat } from '@/shared/completion-rate.rules'

export interface DashboardCompletionRateResponse {
  items: CompletionRateStat[]
  total: number
}
