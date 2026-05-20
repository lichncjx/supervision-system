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

export type NextApprovalAssignmentResult =
  | { kind: 'next'; approver: ApproverAssignment }
  | { kind: 'complete' }
  | { kind: 'missingCompanyLeader' }

export async function presidentAssignment(): Promise<ApproverAssignment | null> {
  const president = await findPresident()
  if (!president) return null

  return {
    currentApproverId: president.id,
    currentApproverRole: Role.PRESIDENT,
  }
}

export async function getNextApprovalAssignment(
  workItem: WorkflowWorkItem,
  approvalType: ApprovalType,
  nextApproverId?: number | null,
): Promise<NextApprovalAssignmentResult> {
  if (approvalType === ApprovalType.PROPOSE) {
    if (isDepartmentApprovalNode(workItem)) {
      const approver = companyLeaderAssignment(workItem, 'propose', nextApproverId)
      return approver ? { kind: 'next', approver } : { kind: 'missingCompanyLeader' }
    }
    return { kind: 'complete' }
  }

  if (
    approvalType === ApprovalType.ADJUST ||
    approvalType === ApprovalType.COMPLETE
  ) {
    if (isDepartmentApprovalNode(workItem)) {
      const approver = companyLeaderAssignment(workItem, 'approval', nextApproverId)
      return approver ? { kind: 'next', approver } : { kind: 'missingCompanyLeader' }
    }
    return { kind: 'complete' }
  }

  if (approvalType === ApprovalType.CANCEL) {
    if (isDepartmentApprovalNode(workItem)) {
      const approver = companyLeaderAssignment(workItem, 'approval', nextApproverId)
      return approver ? { kind: 'next', approver } : { kind: 'missingCompanyLeader' }
    }

    if (
      shouldEscalateCancelToPresident(workItem) &&
      !isPresidentApprovalNode(workItem)
    ) {
      const approver = await presidentAssignment()
      if (!approver) return { kind: 'missingCompanyLeader' }
      if (workItem.currentApproverId === approver.currentApproverId) {
        return { kind: 'complete' }
      }
      return { kind: 'next', approver }
    }

    return { kind: 'complete' }
  }

  return { kind: 'complete' }
}
