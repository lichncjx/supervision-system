import {
  buildWorkVisibilityWhere,
  canViewWorkItem,
  canApproveWorkItem,
  canHandleWorkItem,
  type PermissionUser,
} from '@/lib/server-permissions'
import {
  normalizeLimit,
  toDashboardItem,
  sortExpiringAndOverdue,
  sortMyActionRequired,
  buildSummary,
  isOverdueWorkItem,
  isExpiringWorkItem,
} from '@/features/dashboard/domain/dashboard.rules'
import { findDashboardWorks } from '@/features/dashboard/infrastructure/dashboard.repository'
import type { GetDashboardDataInput, GetDashboardDataResult } from '@/features/dashboard/presentation/dashboard.dto'

export async function getDashboardDataUseCase(
  input: GetDashboardDataInput,
): Promise<GetDashboardDataResult> {
  const { currentUser, options = {} } = input
  const limit = normalizeLimit(options.limit)

  const permUser = currentUser as unknown as PermissionUser
  const whereClause = buildWorkVisibilityWhere(permUser)
  const allRelevantWorks = await findDashboardWorks(whereClause)

  const visibleWorks = allRelevantWorks.filter((workItem) =>
    canViewWorkItem(permUser, workItem),
  )
  const now = new Date()
  const summary = buildSummary(permUser, visibleWorks as any[], now)

  const expiringAndOverdue = sortExpiringAndOverdue(
    visibleWorks.filter(
      (workItem: any) =>
        isExpiringWorkItem(workItem, now) ||
        isOverdueWorkItem(workItem, now),
    ),
    now,
  )
    .slice(0, limit)
    .map((workItem: any) => toDashboardItem(permUser, workItem, now))

  const myActionRequired = sortMyActionRequired(
    permUser,
    visibleWorks.filter(
      (workItem: any) =>
        canApproveWorkItem(permUser, workItem) ||
        canHandleWorkItem(permUser, workItem),
    ) as any[],
    now,
  )
    .slice(0, limit)
    .map((workItem: any) => toDashboardItem(permUser, workItem, now))

  return {
    summary,
    lists: {
      expiringAndOverdue,
      myActionRequired,
    },
  }
}
