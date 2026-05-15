import type { WorkStatus } from '@/lib/work-status'
import type { Work } from '@/features/works/client/work-view.types'

export function getWorkDepartmentIds(work: Work) {
  const ids = new Set<number>()
  const addId = (value: any) => {
    const id = Number(value)
    if (Number.isFinite(id) && id > 0) ids.add(id)
  }
  addId(work.departmentId)
  if (Array.isArray(work.cooperators)) {
    work.cooperators.forEach((c) => addId(c.departmentId))
  }
  return Array.from(ids)
}

export function isWorkRelatedToDepartment(
  work: Work,
  departmentId?: number,
) {
  if (!departmentId) return false
  return getWorkDepartmentIds(work).includes(Number(departmentId))
}

export function isWorkMainResponsibleDepartment(
  work: Work,
  departmentId?: number | null,
) {
  if (!departmentId) return false
  return Number(work.departmentId) === Number(departmentId)
}

export function isCompanyVisibleWork(work: Work) {
  if (work.type !== '重点' && work.type !== '主要') return true
  const companyVisibleWorkStatuses: WorkStatus[] = [
    'proposing', 'in_progress', 'adjusting', 'cancelling',
    'completing', 'completed', 'cancelled',
  ]
  return companyVisibleWorkStatuses.includes(work.status)
}

export function isSupervisorTrackingWork(work: Work) {
  const trackingWorkStatuses: WorkStatus[] = [
    'pending_decompose', 'proposing', 'adjusting', 'cancelling', 'completing',
  ]
  return trackingWorkStatuses.includes(work.status)
}
