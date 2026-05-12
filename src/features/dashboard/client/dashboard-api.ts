import type { User } from '@/lib/auth'
import {
  isWorkStatusInProgress,
  isWorkStatusInPendingApprovalFilter,
} from '@/lib/work-status'
import { getVisibleWorks } from '@/features/works/client/work-api'
import { canHandleWork } from '@/features/works/client/work-client-permissions'
import { isOverdueWork, isExpiringWork } from '@/features/works/client/work-date.utils'
import { isSupervisorTrackingWork } from '@/features/works/client/work-filters'

export async function getStats(user: User | null | undefined) {
  const list = await getVisibleWorks(user)
  const pendingHandleList =
    user?.role === 'SUPERVISOR'
      ? list.filter((w) => isSupervisorTrackingWork(w))
      : list.filter((w) => canHandleWork(user, w))

  return {
    total: list.length,
    approving: list.filter((w) => isWorkStatusInPendingApprovalFilter(w.status)).length,
    inProgress: list.filter((w) => isWorkStatusInProgress(w.status)).length,
    completed: list.filter((w) => w.status === 'completed').length,
    overdue: list.filter((w) => isOverdueWork(w)).length,
    expiring: list.filter((w) => isExpiringWork(w)).length,
    priority: list.filter((w) => w.type === '重点').length,
    main: list.filter((w) => w.type === '主要').length,
    todo: list.filter((w) => w.type === '待办').length,
    handling: pendingHandleList.length,
  }
}
