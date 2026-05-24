import type { Work, WorkEditablePatch } from '@/features/works/client/work-view.types'
import type { WorkflowRecordDto as WorkflowRecord } from "../application/get-workflow-records.usecase"
import type { ErrorData } from '@/shared/http/api-response'
import { getWorkById } from '@/features/works/client/work-api'

async function throwOnError(response: Response) {
  if (!response.ok) {
    const data = (await response.json()) as ErrorData
    throw new Error(data.message || '操作失败')
  }
}

export async function approveWork(work: Work, comment?: string, nextApproverId?: number | null) {
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      action: 'approve',
      ...(comment && { comment }),
      ...(nextApproverId && { nextApproverId }),
    }),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}

export async function rejectWork(work: Work, reason = '审批退回') {
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'reject', rejectReason: reason }),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}

export async function submitComplete(work: Work, proof: string) {
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'evidence', proof, comment: '提交完成' }),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}

export async function submitAdjust(
  work: Work,
  reason: string,
  _pendingAdjustment?: WorkEditablePatch,
) {
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'adjust', adjustReason: reason, comment: '申请调整' }),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}

export async function submitCancel(work: Work, reason: string) {
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'cancel', cancelReason: reason, comment: '申请取消' }),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}

export async function submitPropose(
  work: Work,
  nextApproverId?: number | null,
  comment = '提交审批',
) {
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      action: 'submit',
      comment,
      ...(nextApproverId && { nextApproverId }),
    }),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}

export async function submitTodoDecomposition(
  work: Work,
  patch: WorkEditablePatch,
) {
  const nodes = patch.nodes || []
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'decompose', nodes, comment: '待办分解' }),
  })
  await throwOnError(response)
  return getWorkById(work.id)
}

export async function getWorkflowRecords(workId: number): Promise<WorkflowRecord[]> {
  const response = await fetch(`/api/works/${workId}/workflow`, {
    method: 'GET',
    credentials: 'include',
  })
  if (!response.ok) throw new Error('获取审批记录失败')
  return (await response.json()) as WorkflowRecord[]
}
