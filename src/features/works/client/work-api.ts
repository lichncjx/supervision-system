import { isCompanyLevel, type User } from '@/lib/auth'
import {
  isReturnedDraftWork,
  isWorkStatusInProgress,
  isWorkStatusInPendingApprovalFilter,
} from '@/lib/work-status'
import type { WorkType, WorkQuery } from '@/features/works/domain/work-client.types'
import type { Work, WorkEditablePatch, WorkFilter } from './work-view.types'
import { canHandleWork } from './work-client-permissions'
import { isOverdueWork, isExpiringWork } from './work-date.utils'
import { sortWorksByDueDate } from './work-sort'
import { isWorkRelatedToDepartment, isCompanyVisibleWork } from './work-filters'
import { transformWorkFromAPI } from './work-view-model'

export function transformWorkFromAPI_alias(work: any): Work {
  return transformWorkFromAPI(work)
}

export async function getWorks(): Promise<Work[]> {
  try {
    const response = await fetch('/api/works', { credentials: 'include' })
    if (!response.ok) return []
    const data = await response.json()
    return data.map(transformWorkFromAPI)
  } catch {
    return []
  }
}

export async function getVisibleWorks(
  user: User | null | undefined,
  type?: WorkType,
): Promise<Work[]> {
  const works = await getWorks()
  let list = works

  if (type) list = list.filter((w) => w.type === type)
  if (!user) return []

  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
    return sortWorksByDueDate(list)
  }

  if (isCompanyLevel(user.role, user.departmentId)) {
    return sortWorksByDueDate(list.filter((w) => isCompanyVisibleWork(w)))
  }

  return sortWorksByDueDate(
    list.filter((w) => isWorkRelatedToDepartment(w, user.departmentId)),
  )
}

export async function getWorkById(id: number): Promise<Work | undefined> {
  try {
    const response = await fetch(`/api/works/${id}`, { credentials: 'include' })
    if (!response.ok) return undefined
    const data = await response.json()
    return transformWorkFromAPI(data)
  } catch {
    return undefined
  }
}

export async function queryWorks(
  user: User | null | undefined,
  query: WorkQuery,
): Promise<Work[]> {
  let list = await getVisibleWorks(user)

  if (query.type && query.type !== '全部') list = list.filter((w) => w.type === query.type)
  if (query.departmentId && query.departmentId !== '全部') {
    list = list.filter((w) => isWorkRelatedToDepartment(w, Number(query.departmentId)))
  }
  if (query.status && query.status !== 'all') {
    if (query.status === 'approving') list = list.filter((w) => isWorkStatusInPendingApprovalFilter(w.status))
    if (query.status === 'handling') list = list.filter((w) => canHandleWork(user, w))
    if (query.status === 'draft') list = list.filter((w) => w.status === 'draft' && !isReturnedDraftWork(w))
    if (query.status === 'returnedDraft') list = list.filter((w) => isReturnedDraftWork(w))
    if (query.status === 'pendingDecompose') list = list.filter((w) => w.status === 'pending_decompose')
    if (query.status === 'inProgress') list = list.filter((w) => isWorkStatusInProgress(w.status))
    if (query.status === 'completed') list = list.filter((w) => w.status === 'completed')
    if (query.status === 'cancelled') list = list.filter((w) => w.status === 'cancelled')
    if (query.status === 'overdue') list = list.filter((w) => isOverdueWork(w))
    if (query.status === 'expiring') list = list.filter((w) => isExpiringWork(w))
  }
  if (query.keyword && query.keyword.trim()) {
    const keyword = query.keyword.trim()
    list = list.filter((w) =>
      [w.title, w.workItem, w.description, w.businessCategory,
       w.proposedLeader, w.proposedScene, w.responsibleLeader,
       w.responsiblePerson, w.progress, w.workPlan]
        .filter(Boolean)
        .some((v) => String(v).includes(keyword)),
    )
  }
  return sortWorksByDueDate(list)
}

export async function addWork(work: Omit<Work, 'createdAt' | 'updatedAt'>): Promise<Work> {
  const data: any = {
    type: work.type, title: work.title, departmentId: work.departmentId,
    workItem: work.workItem, workNode: work.workNode,
    businessCategory: work.businessCategory, completeTime: work.completeTime,
    completeForm: work.completeForm, isInnovation: work.isInnovation,
    responsibleLeader: work.responsibleLeader, responsiblePerson: work.responsiblePerson,
    proposedLeader: work.proposedLeader, proposedLeaderId: work.proposedLeaderId,
    proposedScene: work.proposedScene, formedTime: work.formedTime,
    cooperators: work.cooperators, workPlan: work.workPlan,
    planCompleteTime: work.planCompleteTime, progress: work.progress,
    approvalLeaderId: work.approvalLeaderId, nodes: work.nodes,
  }
  const response = await fetch('/api/works', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '创建失败')
  }
  return transformWorkFromAPI(await response.json())
}

export async function updateWork(id: number, patch: Partial<Work>): Promise<Work | undefined> {
  const data: any = {}
  if (patch.title !== undefined) data.title = patch.title
  if (patch.workItem !== undefined) data.workItem = patch.workItem
  if (patch.workNode !== undefined) data.workNode = patch.workNode
  if (patch.businessCategory !== undefined) data.businessCategory = patch.businessCategory
  if (patch.completeTime !== undefined) data.completeTime = patch.completeTime
  if (patch.completeForm !== undefined) data.completeForm = patch.completeForm
  if (patch.isInnovation !== undefined) data.isInnovation = patch.isInnovation
  if (patch.responsibleLeader !== undefined) data.responsibleLeader = patch.responsibleLeader
  if (patch.responsiblePerson !== undefined) data.responsiblePerson = patch.responsiblePerson
  if (patch.proposedLeader !== undefined) data.proposedLeader = patch.proposedLeader
  if (patch.proposedLeaderId !== undefined) data.proposedLeaderId = patch.proposedLeaderId
  if (patch.proposedScene !== undefined) data.proposedScene = patch.proposedScene
  if (patch.formedTime !== undefined) data.formedTime = patch.formedTime
  if (patch.cooperators !== undefined) data.cooperators = patch.cooperators
  if (patch.workPlan !== undefined) data.workPlan = patch.workPlan
  if (patch.planCompleteTime !== undefined) data.planCompleteTime = patch.planCompleteTime
  if (patch.progress !== undefined) data.progress = patch.progress
  if (patch.approvalLeaderId !== undefined) data.approvalLeaderId = patch.approvalLeaderId
  if (patch.nodes !== undefined) data.nodes = patch.nodes
  const response = await fetch(`/api/works/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '修改失败')
  }
  return transformWorkFromAPI(await response.json())
}

export async function deleteWork(id: number): Promise<void> {
  const response = await fetch(`/api/works/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '删除失败')
  }
}

export async function resubmitRejectedWork(work: Work, user: User, patch: WorkEditablePatch) {
  await updateWork(work.id, { ...patch, title: patch.title || patch.workItem || work.title })
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'submit', comment: '修改后重新提交审批' }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '重新提交失败')
  }
  return await getWorkById(work.id)
}

export async function getFilteredWorks(
  user: User | null | undefined,
  filter: WorkFilter,
): Promise<Work[]> {
  const list = await getVisibleWorks(user)
  if (filter === 'all') return list
  if (filter === 'draft') return list.filter((w) => w.status === 'draft' && !isReturnedDraftWork(w))
  if (filter === 'returnedDraft') return list.filter((w) => isReturnedDraftWork(w))
  if (filter === 'pendingDecompose') return list.filter((w) => w.status === 'pending_decompose')
  if (filter === 'approving') return list.filter((w) => isWorkStatusInPendingApprovalFilter(w.status))
  if (filter === 'handling') return list.filter((w) => canHandleWork(user, w))
  if (filter === 'inProgress') return list.filter((w) => isWorkStatusInProgress(w.status))
  if (filter === 'completed') return list.filter((w) => w.status === 'completed')
  if (filter === 'cancelled') return list.filter((w) => w.status === 'cancelled')
  if (filter === 'overdue') return list.filter((w) => isOverdueWork(w))
  if (filter === 'expiring') return list.filter((w) => isExpiringWork(w))
  return list
}
