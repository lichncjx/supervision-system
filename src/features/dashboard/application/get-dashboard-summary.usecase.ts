import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { DashboardSummary } from '@/features/dashboard/domain/dashboard.types'
import { getDashboardDataUseCase } from './get-dashboard-data.usecase'

export type GetDashboardSummaryInput = {
  currentUser: BaseCurrentUser
}

export type GetDashboardSummaryResult = DashboardSummary

export async function getDashboardSummaryUseCase(
  input: GetDashboardSummaryInput,
): Promise<GetDashboardSummaryResult> {
  const data = await getDashboardDataUseCase({
    currentUser: input.currentUser,
    options: { limit: 1 },
  })
  return data.summary
}
