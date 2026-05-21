import type { WorkflowResult } from '@/features/workflow/domain/workflow.types'
import { findActiveCompanyLeaderById } from '@/features/users/infrastructure/user.repository'

export async function ensureNextApproverIsActiveCompanyLeader(
  nextApproverId?: number | null,
): Promise<WorkflowResult | null> {
  if (nextApproverId == null) return null

  const nextApproverUser = await findActiveCompanyLeaderById(nextApproverId)
  if (nextApproverUser) return null

  return { success: false, error: '下一审批人必须是在用的公司领导' }
}
