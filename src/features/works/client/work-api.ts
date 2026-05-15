import { isCompanyLevel } from '@/features/users/domain/role.rules'
import type { User } from '@/features/users/domain/user.types'
import type { WorkType, WorkQuery } from '@/features/works/domain/work-client.types'
import type { Work, WorkEditablePatch } from './work-view.types'
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

const CLIENT_TYPE_TO_SERVER: Record<string, string> = {
  '重点': 'priority',
  '主要': 'main',
  '待办': 'todo',
}

export async function queryWorks(
  user: User | null | undefined,
  query: WorkQuery,
): Promise<Work[]> {
  const params = new URLSearchParams()
  if (query.type && query.type !== '全部')
    params.set('type', CLIENT_TYPE_TO_SERVER[query.type] || query.type)
  if (query.status && query.status !== 'all')
    params.set('status', query.status)
  if (query.departmentId && query.departmentId !== '全部')
    params.set('departmentId', String(query.departmentId))
  if (query.keyword && query.keyword.trim())
    params.set('keyword', query.keyword.trim())

  const url = `/api/works${params.toString() ? '?' + params.toString() : ''}`

  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) return []
    const data = await response.json()
    return data.map(transformWorkFromAPI)
  } catch {
    return []
  }
}

export async function addWork(work: Omit<Work, 'createdAt' | 'updatedAt'>): Promise<Work> {
  const data: any = {
    type: work.type, title: work.title, departmentId: work.departmentId,
    workItem: work.workItem, workNode: work.workNode,
    businessCategory: work.businessCategory,
    completeForm: work.completeForm, isInnovation: work.isInnovation,
    responsibleLeader: work.responsibleLeader, responsiblePerson: work.responsiblePerson,
    responsibleLeaderMemberId: work.responsibleLeaderMemberId,
    responsiblePersonMemberId: work.responsiblePersonMemberId,
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
  if (patch.completeForm !== undefined) data.completeForm = patch.completeForm
  if (patch.isInnovation !== undefined) data.isInnovation = patch.isInnovation
  if (patch.responsibleLeader !== undefined) data.responsibleLeader = patch.responsibleLeader
  if (patch.responsiblePerson !== undefined) data.responsiblePerson = patch.responsiblePerson
  if (patch.responsibleLeaderMemberId !== undefined) data.responsibleLeaderMemberId = patch.responsibleLeaderMemberId
  if (patch.responsiblePersonMemberId !== undefined) data.responsiblePersonMemberId = patch.responsiblePersonMemberId
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

