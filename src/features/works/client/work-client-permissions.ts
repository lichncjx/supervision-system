import type { User } from '@/lib/auth'
import type { Work } from '@/features/works/client/work-view.types'
import type { Status } from '@/features/works/domain/work-client.types'
import { isReturnedDraftWork } from '@/lib/work-status'
import { isWorkRelatedToDepartment } from './work-filters'

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

export function canHandleWork(
  user: User | null | undefined,
  work: Work,
) {
  if (!user) return false
  if (user.role === 'SUPERVISOR' || user.role === 'ADMIN') return false

  if (isReturnedDraftWork(work)) {
    const submitterId = work.firstSubmitterId ?? work.creatorId
    return submitterId === user.id
  }
  if (work.status === 'draft' && work.creatorId === user.id) return true
  if (isReturnedDraftWork(work)) {
    const submitterId = work.firstSubmitterId ?? work.creatorId
    return submitterId === user.id
  }
  if (
    work.type === '待办' &&
    work.status === 'pending_decompose' &&
    (user.role === 'DEPARTMENT_MANAGER' ||
      user.role === 'DEPARTMENT_LEADER') &&
    isWorkRelatedToDepartment(work, user.departmentId)
  )
    return true
  if (
    (work.type === '重点' || work.type === '主要') &&
    work.status === 'in_progress' &&
    (user.role === 'DEPARTMENT_MANAGER' ||
      user.role === 'DEPARTMENT_LEADER') &&
    isWorkRelatedToDepartment(work, user.departmentId)
  )
    return true
  if (
    work.type === '待办' &&
    work.status === 'in_progress' &&
    (user.role === 'DEPARTMENT_MANAGER' ||
      user.role === 'DEPARTMENT_LEADER') &&
    isWorkRelatedToDepartment(work, user.departmentId)
  )
    return true
  return false
}

export function canProcessWork(
  user: User | null | undefined,
  work: Work,
) {
  return canApproveWork(user, work) || canHandleWork(user, work)
}

export function canApproveWork(
  user: User | null | undefined,
  work: Work,
) {
  if (!user) return false
  const pendingStatuses: Status[] = [
    'proposing',
    'adjusting',
    'cancelling',
    'completing',
  ]
  if (!pendingStatuses.includes(work.status)) return false
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
