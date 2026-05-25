import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type {
  DashboardData,
  DashboardDataOptions,
  DashboardWorkLike,
} from '@/features/dashboard/domain/dashboard.types'
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

export async function getDashboardDataUseCase(
  input: GetDashboardDataInput,
): Promise<DashboardData> {
  const { currentUser, options = {} } = input
  const limit = normalizeLimit(options.limit)

  const permUser = toPermissionUser(currentUser)
  const whereClause = await buildWorkVisibilityWhere(currentUser)
  const allRelevantWorks = await findDashboardWorks(whereClause)

  const visibleWorks: DashboardWorkLike[] = allRelevantWorks.filter((workItem) =>
    canViewWorkItem(permUser, workItem),
  )
  const now = new Date()
  const summary = buildSummary(permUser, visibleWorks, now)

  const expiringAndOverdue = sortExpiringAndOverdue(
    visibleWorks.filter(
      (workItem) =>
        isExpiringWorkItem(workItem, now) ||
        isOverdueWorkItem(workItem, now),
    ),
    now,
  )
    .slice(0, limit)
    .map((workItem) => toDashboardItem(permUser, workItem, now))

  const myActionRequired = sortMyActionRequired(
    permUser,
    visibleWorks.filter(
      (workItem) =>
        canApproveWorkItem(permUser, workItem) ||
        shouldHandleWorkItem(permUser, workItem),
    ),
    now,
  )
    .slice(0, limit)
    .map((workItem) => toDashboardItem(permUser, workItem, now))

  return {
    summary,
    lists: {
      expiringAndOverdue,
      myActionRequired,
    },
  }
}
