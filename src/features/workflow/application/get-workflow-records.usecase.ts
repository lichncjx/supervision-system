import { findWorkflowRecordsByWorkItemId } from '@/features/workflow/infrastructure/workflow.repository'

export async function getWorkflowRecords(workItemId: number) {
  const records = await findWorkflowRecordsByWorkItemId(workItemId)

  return records.map((record) => ({
    id: record.id,
    action: record.actionType,
    initiatorId: record.initiatorId,
    initiatorName: record.initiator?.name || '',
    initiatorRole: record.initiator?.role || record.approvalRole,
    previousStatus: record.statusBefore,
    newStatus: record.statusAfter,
    comment: record.comment,
    createdAt: record.createdAt,
  }))
}
