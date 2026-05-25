import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { canViewWorkItem } from '@/features/works/domain/work.permissions'
import { findWorkForUpdateById } from '@/features/works/infrastructure/work.repository'
import { findWorkflowRecordsByWorkItemId } from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export interface WorkflowRecordDto {
  id: number
  action: string
  initiatorId: number
  initiatorName: string
  initiatorRole: string
  previousStatus: string
  newStatus: string
  comment: string | null
  createdAt: string
}

export async function getWorkflowRecords(
  currentUser: BaseCurrentUser,
  workItemId: number,
): Promise<Result<WorkflowRecordDto[]>> {
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  const permUser = toPermissionUser(currentUser)
  if (!canViewWorkItem(permUser, workItem)) {
    return err(403, '无权查看该事项审批记录')
  }

  const records = await findWorkflowRecordsByWorkItemId(workItemId)

  return ok(records.map((record) => ({
    id: record.id,
    action: record.actionType,
    initiatorId: record.initiatorId,
    initiatorName: record.initiator?.name || '',
    initiatorRole: record.initiator?.role || record.approvalRole,
    previousStatus: record.statusBefore,
    newStatus: record.statusAfter,
    comment: record.comment,
    createdAt: record.createdAt.toISOString(),
  })))
}
