import { getDashboardDataUseCase } from './get-dashboard-data.usecase'
import type { GetDashboardSummaryInput, GetDashboardSummaryResult } from '@/features/dashboard/presentation/dashboard.dto'

export async function getDashboardSummaryUseCase(
  input: GetDashboardSummaryInput,
): Promise<GetDashboardSummaryResult> {
  const data = await getDashboardDataUseCase({
    currentUser: input.currentUser,
    options: { limit: 1 },
  })
  return data.summary
}
