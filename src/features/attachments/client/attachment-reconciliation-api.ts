import type { ErrorData } from '@/shared/http/api-response'
import type { AttachmentFileReconciliationResult } from '@/features/attachments/contract/attachment-reconciliation.types'

export const ATTACHMENT_RECONCILIATION_GRACE_PERIOD_HOURS = 24

const APPLY_CONFIRMATION = 'DELETE_ORPHAN_ATTACHMENT_FILES'

async function readReconciliationResponse(
  response: Response,
): Promise<AttachmentFileReconciliationResult> {
  const data = (await response.json()) as AttachmentFileReconciliationResult & Partial<ErrorData>

  if (!response.ok) {
    throw new Error(data.message || '附件存储对账失败')
  }

  return data
}

export async function inspectAttachmentStorage(): Promise<AttachmentFileReconciliationResult> {
  const response = await fetch(
    `/api/attachments/reconcile?gracePeriodHours=${ATTACHMENT_RECONCILIATION_GRACE_PERIOD_HOURS}`,
    { credentials: 'include' },
  )

  return readReconciliationResponse(response)
}

export async function cleanupAttachmentStorage(): Promise<AttachmentFileReconciliationResult> {
  const response = await fetch('/api/attachments/reconcile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      confirm: APPLY_CONFIRMATION,
      gracePeriodHours: ATTACHMENT_RECONCILIATION_GRACE_PERIOD_HOURS,
    }),
  })

  return readReconciliationResponse(response)
}
