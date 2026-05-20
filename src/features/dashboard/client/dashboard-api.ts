import type { User } from '@/features/users/domain/user.types'
import {
  isInProgress,
  isApproving,
} from '@/features/works/domain/work-status.rules'
import { getVisibleWorks } from '@/features/works/client/work-api'
import { canHandleWork } from '@/features/works/client/work-client-permissions'
import { isOverdueWork, isExpiringWork } from '@/features/works/client/work-date.utils'
import type { Work } from '@/features/works/client/work-view.types'
import type { WorkStatus } from '@/features/works/domain/work-status'

export async function getStats(user: User | null | undefined) {
  const list = await getVisibleWorks()
  const pendingHandleList =
    user?.role === 'SUPERVISOR'
      ? list.filter((w) => isSupervisorTrackingWork(w))
      : list.filter((w) => canHandleWork(user, w))

  return {
    total: list.length,
    approving: list.filter((w) => isApproving(w.status)).length,
    inProgress: list.filter((w) => isInProgress(w.status)).length,
    completed: list.filter((w) => w.status === 'completed').length,
    overdue: list.filter((w) => isOverdueWork(w)).length,
    expiring: list.filter((w) => isExpiringWork(w)).length,
    priority: list.filter((w) => w.type === '重点').length,
    main: list.filter((w) => w.type === '主要').length,
    todo: list.filter((w) => w.type === '待办').length,
    handling: pendingHandleList.length,
  }
}/** 督办追踪状态（非终态且已提交/审批中） */

export function isSupervisorTrackingWork(work: Work) {
  const trackingWorkStatuses: WorkStatus[] = [
    'pending_decompose', 'proposing', 'adjusting', 'cancelling', 'completing',
  ]
  return trackingWorkStatuses.includes(work.status)
}

