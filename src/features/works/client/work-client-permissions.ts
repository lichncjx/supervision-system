import type { User } from '@/features/users/domain/user.types'
import type { Work } from '@/features/works/client/work-view.types'
import type { WorkStatus } from '@/features/works/domain/work-status'
import { isReturnedDraftWork, isReturnedInProgressWork } from '@/features/works/domain/work-status.rules'

function isSelectedCompanyApprover(user: User, work: Work) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return false
  if (work.currentApproverId) return work.currentApproverId === user.id
  if (work.currentApproverRole) return work.currentApproverRole === user.role
  if (
    (work.action === 'adjust' || work.action === 'cancel') &&
    work.approvalLeaderId
  ) {
    return work.approvalLeaderId === user.id
  }
  if (
    work.type === '待办' &&
    work.status === 'proposing' &&
    work.proposedLeaderId
  ) {
    return work.proposedLeaderId === user.id
  }
  if (
    (work.type === '重点' || work.type === '主要') &&
    (work.status === 'proposing' || work.status === 'completing')
  ) {
    return user.role === 'VICE_PRESIDENT'
  }
  return false
}

// 原子权限函数 —— 不含 ADMIN/SUPERVISOR，只判断普通业务角色能否办理

export function canEditRegularDraftWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  if (!user) return false
  if (work.status !== 'draft') return false
  if (isReturnedDraftWork(work)) return false
  return work.creatorId === user.id
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
  return user.id === (work.firstSubmitterId ?? work.creatorId)
}

export function canHandleReturnedInProgressWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  if (!user) return false
  if (!isReturnedInProgressWork(work)) return false
  return user.id === (work.firstSubmitterId ?? work.creatorId)
}

export function canDecomposeTodoWork(
  user: User | null | undefined,
  work: Work,
): boolean {
  if (!user) return false
  if (work.type !== '待办') return false
  if (work.status !== 'pending_decompose') return false
  if (user.role !== 'DEPARTMENT_MANAGER' && user.role !== 'DEPARTMENT_LEADER') return false
  // 事项主责部门与用户部门匹配
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
  if (
    work.currentApproverRole &&
    work.currentApproverRole !== user.role
  )
    return false
  if (
    user.role === 'DEPARTMENT_LEADER' ||
    user.role === 'DEPARTMENT_MANAGER'
  ) {
    return (
      work.currentApproverRole === user.role &&
      isWorkRelatedToDepartment(work, user.departmentId) &&
      (work.status === 'proposing' ||
        work.status === 'adjusting' ||
        work.status === 'cancelling' ||
        work.status === 'completing')
    )
  }
  if (
    work.status === 'proposing' ||
    work.status === 'completing' ||
    work.status === 'cancelling' ||
    work.status === 'adjusting'
  ) {
    return isSelectedCompanyApprover(user, work)
  }
  return false
}

/** 事项是否与指定部门有关联（主责 或 配合） */
export function isWorkRelatedToDepartment(work: Work, departmentId: number) {
  if (Number(work.departmentId) === departmentId) return true
  if (Array.isArray(work.cooperators)) {
    return work.cooperators.some((c) => Number(c.departmentId) === departmentId)
  }
  return false
}

