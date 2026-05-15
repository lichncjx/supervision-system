import { shouldCountWorkStatusForDeadline } from '@/features/works/domain/work-status.rules'
import type { Work } from '@/features/works/client/work-view.types'

export function getWorkDueDate(work: Work) {
  return work.planCompleteTime || ''
}

export function isOverdueWork(work: Work) {
  const date = getWorkDueDate(work)
  if (!date) return false
  if (!shouldCountWorkStatusForDeadline(work.status)) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(date); target.setHours(0, 0, 0, 0)
  return target.getTime() < today.getTime()
}

export function isExpiringWork(work: Work) {
  const date = getWorkDueDate(work)
  if (!date) return false
  if (!shouldCountWorkStatusForDeadline(work.status)) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(date); target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today.getTime()
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
}
