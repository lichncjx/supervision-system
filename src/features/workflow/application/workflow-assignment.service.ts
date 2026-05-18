import { ApprovalType, Role } from '@prisma/client'
import type { ApproverAssignment } from '@/features/workflow/domain/workflow.types'
import {
  companyLeaderAssignment,
  isDepartmentApprovalNode,
  isPresidentApprovalNode,
  shouldEscalateCancelToPresident,
} from '@/features/workflow/domain/workflow.rules'
import { type WorkflowWorkItem } from '@/features/workflow/infrastructure/workflow.repository'
import { findPresident } from '@/features/users/infrastructure/user.repository'

export async function presidentAssignment(): Promise<ApproverAssignment> {
  const president = await findPresident()

  return {
    currentApproverId: president?.id ?? null,
    currentApproverRole: Role.PRESIDENT,
  }
}

export async function getNextApprovalAssignment(
  workItem: WorkflowWorkItem,
  approvalType: ApprovalType,
  nextApproverId?: number | null,
): Promise<ApproverAssignment | null> {
  if (approvalType === ApprovalType.PROPOSE) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'propose', nextApproverId)
    }
    return null
  }

  if (
    approvalType === ApprovalType.ADJUST ||
    approvalType === ApprovalType.COMPLETE
  ) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval', nextApproverId)
    }
    return null
  }

  if (approvalType === ApprovalType.CANCEL) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval', nextApproverId)
    }

    if (
      shouldEscalateCancelToPresident(workItem) &&
      !isPresidentApprovalNode(workItem)
    ) {
      return presidentAssignment()
    }

    return null
  }

  return null
}
