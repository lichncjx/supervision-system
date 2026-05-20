import type { User } from '@/features/users/domain/user.types'
import type { Work } from '@/features/works/client/work-view.types'
import type { WorkStatus } from '@/features/works/domain/work-status'
import { isReturnedDraftWork, isReturnedInProgressWork } from '@/features/works/domain/work-status.rules'
import { isCompanyLevel, isDeptLeader } from '@/features/users/domain/role.rules'

export function isOwnedBy(user: { id: number }, work: Work): boolean {
  return (work.firstSubmitterId ?? work.creatorId) === user.id
}

// 原子权限函数 —— 不含 ADMIN/SUPERVISOR，只判断普通业务角色能否办理

export function canEditRegularDraftWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  if (!user) return false
  if (work.status !== 'draft') return false
  if (isReturnedDraftWork(work)) return false
  return isOwnedBy(user, work)
}

export function canSubmitDraftWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  return canEditRegularDraftWork(user, work)
}

export function canHandleReturnedDraftWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  if (!user) return false
  if (!isReturnedDraftWork(work)) return false
  return isOwnedBy(user, work)
}

export function canHandleReturnedInProgressWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  if (!user) return false
  if (!isReturnedInProgressWork(work)) return false
  return isOwnedBy(user, work)
}

export function canDecomposeTodoWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  if (!user) return false
  if (work.status !== 'pending_decompose') return false
  if (user.role !== 'DEPARTMENT_MANAGER' && user.role !== 'DEPARTMENT_LEADER') return false
  return Number(work.departmentId) === Number(user.departmentId)
}

export function canHandleWork(
  user: User | null | undefined,
  work: Work,
) {
  if (!user) return false
  if (user.role === 'SUPERVISOR' || user.role === 'ADMIN') return false

  if (canHandleReturnedDraftWork(user, work)) return true
  if (canEditRegularDraftWork(user, work)) return true
  if (canDecomposeTodoWork(user, work)) return true
  if (canHandleReturnedInProgressWork(user, work)) return true

  return false
}

export function canApproveWork(
  user: User | null | undefined,
  work: Work,
) {
  if (!user) return false
  const pendingWorkStatuses: WorkStatus[] = [
    'proposing',
    'adjusting',
    'cancelling',
    'completing',
  ]
  if (!pendingWorkStatuses.includes(work.status)) return false
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return false

  if (work.currentApproverId)
    return work.currentApproverId === user.id

  if (!work.currentApproverRole || work.currentApproverRole !== user.role)
    return false

  if (isCompanyLevel(user.role))
    return work.proposedLeaderId === user.id || work.approvalLeaderId === user.id

  return isDeptLeader(user.role) && isWorkMainResponsibleDepartment(work, user.departmentId)
}

/** 事项的主责部门是否为指定部门（仅 departmentId，不含配合） */
function isWorkMainResponsibleDepartment(work: Work, departmentId?: number | null): boolean {
  if (!departmentId) return false
  return Number(work.departmentId) === departmentId
}

/** 事项是否与指定部门有关联（主责 或 配合） */
export function isWorkRelatedToDepartment(work: Work, departmentId: number) {
  if (Number(work.departmentId) === departmentId) return true
  if (Array.isArray(work.cooperators)) {
    return work.cooperators.some((c) => Number(c.departmentId) === departmentId)
  }
  return false
}

