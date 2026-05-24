import { findCompanyLeaderById } from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err } from '@/shared/result'

export async function ensureIsActiveCompanyLeader(
  nextApproverId?: number | null,
): Promise<Result | null> {
  if (nextApproverId == null) return null

  const nextApproverUser = await findCompanyLeaderById(nextApproverId)
  if (nextApproverUser) return null

  return err(400, '下一审批人必须是在用的公司领导')
}
