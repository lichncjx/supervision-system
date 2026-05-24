import type { User } from '@/features/users/client/user-client.types'
import type { WorkType, WorkQuery } from '@/features/works/client/work-client.types'
import type { Work, WorkEditablePatch } from './work-view.types'
import type {
  WorkApiDto,
} from '@/features/works/contract/work-api.types'
import type { ErrorData } from '@/shared/http/api-response'
import { sortWorksByDueDate } from './work-sort'
import {
  buildCreateWorkRequest,
  buildUpdateWorkRequest,
  transformWorkFromAPI,
} from './work-view-model'

export async function getWorks(): Promise<Work[]> {
  try {
    const response = await fetch('/api/works', { credentials: 'include' })
    if (!response.ok) return []
    const data = (await response.json()) as WorkApiDto[]
    return data.map(transformWorkFromAPI)
  } catch {
    return []
  }
}

export async function getVisibleWorks(type?: WorkType): Promise<Work[]> {
  let list = await getWorks()
  if (type) list = list.filter((w) => w.type === type)

  return sortWorksByDueDate(list)
}

export async function getWorkById(id: number): Promise<Work | undefined> {
  try {
    const response = await fetch(`/api/works/${id}`, { credentials: 'include' })
    if (!response.ok) return undefined
    const data = (await response.json()) as WorkApiDto
    return transformWorkFromAPI(data)
  } catch {
    return undefined
  }
}

const CLIENT_TYPE_TO_SERVER: Record<string, string> = {
  重点: 'priority',
  主要: 'main',
  待办: 'todo',
}

export async function queryWorks(user: User | null | undefined, query: WorkQuery): Promise<Work[]> {
  const params = new URLSearchParams()
  if (query.type && query.type !== '全部')
    params.set('type', CLIENT_TYPE_TO_SERVER[query.type] || query.type)
  if (query.status && query.status !== 'all') params.set('status', query.status)
  if (query.departmentId && query.departmentId !== '全部')
    params.set('departmentId', String(query.departmentId))
  if (query.keyword && query.keyword.trim()) params.set('keyword', query.keyword.trim())

  const url = `/api/works${params.toString() ? '?' + params.toString() : ''}`

  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) return []
    const data = (await response.json()) as WorkApiDto[]
    return data.map(transformWorkFromAPI)
  } catch {
    return []
  }
}

export async function addWork(work: Omit<Work, 'createdAt' | 'updatedAt'>): Promise<Work> {
  const data = buildCreateWorkRequest(work)
  const response = await fetch('/api/works', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!response.ok) {
    const error = (await response.json()) as ErrorData
    throw new Error(error.message || '创建失败')
  }
  return transformWorkFromAPI((await response.json()) as WorkApiDto)
}

export async function updateWork(id: number, patch: WorkEditablePatch): Promise<Work | undefined> {
  const data = buildUpdateWorkRequest(patch)
  const response = await fetch(`/api/works/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  })
  if (!response.ok) {
    const error = (await response.json()) as ErrorData
    throw new Error(error.message || '修改失败')
  }
  return transformWorkFromAPI((await response.json()) as WorkApiDto)
}

export async function deleteWork(id: number): Promise<void> {
  const response = await fetch(`/api/works/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    const error = (await response.json()) as ErrorData
    throw new Error(error.message || '删除失败')
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
    const error = (await response.json()) as ErrorData
    throw new Error(error.message || '重新提交失败')
  }
  return await getWorkById(work.id)
}
