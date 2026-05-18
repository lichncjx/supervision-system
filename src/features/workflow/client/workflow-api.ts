import type { User } from '@/features/users/domain/user.types'
import type { Work, WorkEditablePatch } from '@/features/works/client/work-view.types'
import type { WorkflowRecord } from '@/features/workflow/domain/workflow-client.types'
import { getWorkById } from '@/features/works/client/work-api'

export async function approveWork(user: User, work: Work, comment?: string, nextApproverId?: number | null) {
  try {
    const body: Record<string, unknown> = { action: 'approve' }
    if (comment) body.comment = comment
    if (nextApproverId) body.nextApproverId = nextApproverId
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const result = await response.json()
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
    const result = await response.json()
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
    const result = await response.json()
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
    const result = await response.json()
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
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || '申请取消失败')
    return await getWorkById(work.id)
  } catch (error) {
    console.error('Submit cancel error:', error)
    throw error
  }
}

export async function submitWork(work: Work, _user: User) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'submit', comment: '提交审批' }),
    })
    const result = await response.json()
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
    const result = await response.json()
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
    return await response.json()
  } catch (error) {
    console.error('获取审批记录失败:', error)
    return []
  }
}
