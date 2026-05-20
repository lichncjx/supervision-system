import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { DashboardData, DashboardDataOptions } from '@/features/dashboard/domain/dashboard.types'
import {
  canViewWorkItem,
  canApproveWorkItem,
  shouldHandleWorkItem,
} from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { buildWorkVisibilityWhere } from '@/shared/db/work-visibility-builder'
import {
  normalizeLimit,
  toDashboardItem,
  sortExpiringAndOverdue,
  sortMyActionRequired,
  buildSummary,
} from '@/features/dashboard/domain/dashboard.rules'
import {
  isExpiringWorkItem,
  isOverdueWorkItem,
} from '@/features/works/domain/work-status.rules'
import { findDashboardWorks } from '@/features/dashboard/infrastructure/dashboard.repository'

export type GetDashboardDataInput = {
  currentUser: BaseCurrentUser
  options?: DashboardDataOptions
}

export type GetDashboardDataResult = DashboardData

export async function getDashboardDataUseCase(
  input: GetDashboardDataInput,
): Promise<GetDashboardDataResult> {
  const { currentUser, options = {} } = input
  const limit = normalizeLimit(options.limit)

  const permUser = toPermissionUser(currentUser)
  const whereClause = await buildWorkVisibilityWhere(currentUser)
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
        shouldHandleWorkItem(permUser, workItem),
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
