import { ApprovalType, Role } from '@prisma/client'
import type { ApproverAssignment } from '@/features/workflow/domain/workflow.types'
import {
  companyLeaderAssignment,
  isDepartmentApprovalNode,
  isPresidentApprovalNode,
  shouldEscalateCancelToPresident,
} from '@/features/workflow/domain/workflow.rules'
import {
  findPresidentUser,
  type WorkflowWorkItem,
} from '@/features/workflow/infrastructure/workflow.repository'

export async function presidentAssignment(): Promise<ApproverAssignment> {
  const president = await findPresidentUser()

  return {
    currentApproverId: president?.id ?? null,
    currentApproverRole: Role.PRESIDENT,
  }
}

export async function getNextApprovalAssignment(
  workItem: WorkflowWorkItem,
  approvalType: ApprovalType,
): Promise<ApproverAssignment | null> {
  if (approvalType === ApprovalType.PROPOSE) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'propose')
    }
    return null
  }

  if (
    approvalType === ApprovalType.ADJUST ||
    approvalType === ApprovalType.COMPLETE
  ) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval')
    }
    return null
  }

  if (approvalType === ApprovalType.CANCEL) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval')
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
