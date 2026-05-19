import type { WorkStatus } from '@/features/works/domain/work-status'
import type { Work } from '@/features/works/client/work-view.types'

/** 事项关联的所有部门 ID（主责 + 配合），去重 */
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

/** 事项是否与指定部门有关联（主责 或 配合） */
export function isWorkRelatedToDepartment(
  work: Work,
  departmentId?: number,
) {
  if (!departmentId) return false
  return getWorkDepartmentIds(work).includes(Number(departmentId))
}

/** 事项的主责部门是否为指定部门 */
export function isWorkMainResponsibleDepartment(
  work: Work,
  departmentId?: number | null,
) {
  if (!departmentId) return false
  return Number(work.departmentId) === Number(departmentId)
}

/** 重点/主要事项在特定状态下对公司级角色可见 */
export function isCompanyVisibleWork(work: Work) {
  if (work.type !== '重点' && work.type !== '主要') return true
  const companyVisibleWorkStatuses: WorkStatus[] = [
    'proposing', 'in_progress', 'adjusting', 'cancelling',
    'completing', 'completed', 'cancelled',
  ]
  return companyVisibleWorkStatuses.includes(work.status)
}

/** 督办追踪状态（非终态且已提交/审批中） */
export function isSupervisorTrackingWork(work: Work) {
  const trackingWorkStatuses: WorkStatus[] = [
    'pending_decompose', 'proposing', 'adjusting', 'cancelling', 'completing',
  ]
  return trackingWorkStatuses.includes(work.status)
}
