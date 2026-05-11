export { getDashboardDataUseCase as getDashboardData } from '@/features/dashboard/application/get-dashboard-data.usecase'
export { getDashboardSummaryUseCase as getDashboardSummary } from '@/features/dashboard/application/get-dashboard-summary.usecase'

export type {
  DashboardSummary,
  WorkDashboardItem,
  DashboardData,
  DashboardDataOptions,
} from '@/features/dashboard/domain/dashboard.types'
