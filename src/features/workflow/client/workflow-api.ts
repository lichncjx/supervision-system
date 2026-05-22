import type { User } from '@/features/users/client/user-client.types'
import type { Work, WorkEditablePatch } from '@/features/works/client/work-view.types'
import type { WorkflowRecordApiDto as WorkflowRecord } from '@/features/workflow/contract/workflow-api.types'
import type {
  WorkflowActionRequest,
  WorkflowActionResponse,
  WorkflowRecordsResponse,
} from '@/features/workflow/contract/workflow-api.types'
import type { ApiErrorResponse } from '@/shared/http/api-response'
import { getWorkById } from '@/features/works/client/work-api'

async function readWorkflowResult(response: Response): Promise<WorkflowActionResponse & ApiErrorResponse> {
  return (await response.json()) as WorkflowActionResponse & ApiErrorResponse
}

export async function approveWork(user: User, work: Work, comment?: string, nextApproverId?: number | null) {
  try {
    const body: WorkflowActionRequest = { action: 'approve' }
    if (comment) body.comment = comment
    if (nextApproverId) body.nextApproverId = nextApproverId
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const result = await readWorkflowResult(response)
    if (!response.ok) throw new Error(result.error || '审批失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Approve work error:', error)
    throw error
  }
}

export async function rejectWork(work: Work, user: User, reason = '审批退回') {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'reject', rejectReason: reason }),
    })
    const result = await readWorkflowResult(response)
    if (!response.ok) throw new Error(result.error || '退回失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Reject work error:', error)
    throw error
  }
}

export async function submitComplete(work: Work, user: User, proof: string) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'evidence', proof, comment: '提交完成' }),
    })
    const result = await readWorkflowResult(response)
    if (!response.ok) throw new Error(result.error || '提交失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Submit complete error:', error)
    throw error
  }
}

export async function submitAdjust(
  work: Work,
  user: User,
  reason: string,
  _pendingAdjustment?: WorkEditablePatch,
) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'adjust', adjustReason: reason, comment: '申请调整' }),
    })
    const result = await readWorkflowResult(response)
    if (!response.ok) throw new Error(result.error || '申请调整失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Submit adjust error:', error)
    throw error
  }
}

export async function submitCancel(work: Work, user: User, reason: string) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'cancel', cancelReason: reason, comment: '申请取消' }),
    })
    const result = await readWorkflowResult(response)
    if (!response.ok) throw new Error(result.error || '申请取消失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Submit cancel error:', error)
    throw error
  }
}

export async function submitWork(
  work: Work,
  _user: User,
  nextApproverId?: number | null,
  comment = '提交审批',
) {
  try {
    const body: WorkflowActionRequest = { action: 'submit', comment }
    if (nextApproverId) body.nextApproverId = nextApproverId

    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const result = await readWorkflowResult(response)
    if (!response.ok) throw new Error(result.error || '提交审批失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Submit work error:', error)
    throw error
  }
}

export async function submitTodoDecomposition(
  work: Work,
  user: User,
  patch: WorkEditablePatch,
) {
  try {
    const nodes = patch.nodes || []
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'decompose', nodes, comment: '待办分解' }),
    })
    const result = await readWorkflowResult(response)
    if (!response.ok) throw new Error(result.error || '分解失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Submit todo decomposition error:', error)
    throw error
  }
}

export async function getWorkflowRecords(workId: number): Promise<WorkflowRecord[]> {
  try {
    const response = await fetch(`/api/works/${workId}/workflow`, {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) throw new Error('获取审批记录失败')
    return (await response.json()) as WorkflowRecordsResponse
  } catch (error) {
    console.error('获取审批记录失败:', error)
    return []
  }
}
