import type { WorkQuery } from '@/features/works/client/work-client.types'
import type { Work, WorkEditablePatch } from './work-client.types'
import type { WorkDto } from '../application/work.dto'
import type { ErrorData } from '@/shared/http/api-response'
import {
  buildCreateWorkBody,
  buildUpdateWorkBody,
  transformWorkFromAPI,
} from './work-client.mapper'

export async function getWorkById(id: number): Promise<Work | undefined> {
  try {
    const response = await fetch(`/api/works/${id}`, { credentials: 'include' })
    if (!response.ok) return undefined
    const data = (await response.json()) as WorkDto
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

export async function queryWorks(query: WorkQuery): Promise<Work[]> {
  const params = new URLSearchParams()
  if (query.type && query.type !== '全部')
    params.set('type', CLIENT_TYPE_TO_SERVER[query.type] || query.type)
  if (query.status && query.status !== 'all') params.set('status', query.status)
  if (query.departmentId && query.departmentId !== '全部')
    params.set('departmentId', String(query.departmentId))
  if (query.keyword && query.keyword.trim()) params.set('keyword', query.keyword.trim())
  if (query.assessmentYear) params.set('assessmentYear', String(query.assessmentYear))
  else if (query.assessmentYear === null) params.set('assessmentYear', 'all')
  if (query.workItem && query.workItem.trim()) params.set('workItem', query.workItem.trim())

  const url = `/api/works${params.toString() ? '?' + params.toString() : ''}`

  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) return []
    const data = (await response.json()) as WorkDto[]
    return data.map(transformWorkFromAPI)
  } catch {
    return []
  }
}

export async function addWork(
  work: Omit<Work, 'title' | 'createdAt' | 'updatedAt'>,
): Promise<Work> {
  const data = buildCreateWorkBody(work)
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
  return transformWorkFromAPI((await response.json()) as WorkDto)
}

export async function updateWork(id: number, patch: WorkEditablePatch): Promise<Work | undefined> {
  const data = buildUpdateWorkBody(patch)
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
  return transformWorkFromAPI((await response.json()) as WorkDto)
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

export async function resubmitRejectedWork(work: Work, patch: WorkEditablePatch) {
  await updateWork(work.id, patch)
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
