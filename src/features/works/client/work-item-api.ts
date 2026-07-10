import type { ErrorData } from '@/shared/http/api-response'

export interface WorkItemOption {
  workItem: string
  visibleNodeCount: number
}

export async function getWorkItemOptions(params: {
  type: 'priority' | 'main'
  assessmentYear: string
  departmentId?: string | number | null
  keyword?: string
}, signal?: AbortSignal): Promise<WorkItemOption[]> {
  const searchParams = new URLSearchParams({
    type: params.type,
    assessmentYear: params.assessmentYear,
  })
  if (params.departmentId) searchParams.set('departmentId', String(params.departmentId))
  if (params.keyword) searchParams.set('keyword', params.keyword)

  const response = await fetch(`/api/works/work-item-options?${searchParams.toString()}`, {
    credentials: 'include',
    signal,
  })
  if (!response.ok) return []
  return response.json() as Promise<WorkItemOption[]>
}

export interface BatchWorkNodeDraft {
  workNode: string
  departmentId: number
  responsibleLeader?: string
  responsiblePerson?: string
  responsibleLeaderUserId?: number
  responsiblePersonUserId?: number
  planCompleteTime?: string
  completeForm?: string
}

export async function createWorkDraftsBatch(params: {
  type: 'priority' | 'main'
  assessmentYear: number
  workItem: string
  defaults?: { businessCategory?: string | null; isInnovation?: boolean }
  nodes: BatchWorkNodeDraft[]
}): Promise<{ count: number; ids: number[] }> {
  const response = await fetch('/api/works/batch-drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const error = await response.json() as ErrorData
    throw new Error(error.message || '批量创建失败')
  }
  return response.json() as Promise<{ count: number; ids: number[] }>
}
