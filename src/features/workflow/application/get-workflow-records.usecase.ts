import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { canViewWorkItem } from '@/features/works/domain/work.permissions'
import { findWorkForUpdateById } from '@/features/works/infrastructure/work.repository'
import { findWorkflowRecordsByWorkItemId } from '@/features/workflow/infrastructure/workflow.repository'
import type { WorkflowRecordsResponse } from '@/features/workflow/contract/workflow-api.types'

export type GetWorkflowRecordsResult =
  | { kind: 'ok'; data: WorkflowRecordsResponse }
  | { kind: 'error'; status: number; message: string }

export async function getWorkflowRecords(
  currentUser: BaseCurrentUser,
  workItemId: number,
): Promise<GetWorkflowRecordsResult> {
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return { kind: 'error', status: 404, message: '事项不存在' }
  }

  const permUser = toPermissionUser(currentUser)
  if (!canViewWorkItem(permUser, workItem)) {
    return { kind: 'error', status: 403, message: '无权查看该事项审批记录' }
  }

  const records = await findWorkflowRecordsByWorkItemId(workItemId)

  return {
    kind: 'ok',
    data: records.map((record) => ({
      id: record.id,
      action: record.actionType,
      initiatorId: record.initiatorId,
      initiatorName: record.initiator?.name || '',
      initiatorRole: record.initiator?.role || record.approvalRole,
      previousStatus: record.statusBefore,
      newStatus: record.statusAfter,
      comment: record.comment,
      createdAt: record.createdAt.toISOString(),
    })),
  }
}
