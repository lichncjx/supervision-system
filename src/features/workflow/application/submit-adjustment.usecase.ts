import { ActionType, ApprovalType, Prisma, WorkItemStatus } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canUserOperate, getProcessFirstApprover } from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById, updateWorkItem } from '@/features/works/infrastructure/work.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { validateMemberAssignments, type MemberAssignment } from '@/features/members/domain/member.rules'
import { buildAdjustmentBeforeSnapshot, sanitizeAdjustmentPatch } from '@/features/workflow/application/adjustment-patch'
import { getChangedAdjustmentFields } from '@/features/works/domain/work-adjustment-diff'
import { createAdjustment, createWorkflowRecord, createOperationLog } from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

export async function submitAdjustment(
  workItemId: number,
  user: BaseCurrentUser,
  adjustReason: string,
  pendingAdjustment: unknown,
  comment?: string,
): Promise<Result> {
  const permUser = toPermissionUser(user)
  const workItem = await findWorkForUpdateById(workItemId)
  if (!workItem) {
    return err(404, '事项不存在')
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return err(400, '只有进行中事项可以申请调整')
  }

  // 办理人权限按 firstSubmitterId ?? creatorId 保留，不随当前主责部门人员调整而收回。
  if (!canUserOperate(user, workItem)) {
    return err(403, '无权申请调整')
  }

  const oldStatus = workItem.status
  const approver = getProcessFirstApprover(workItem, user)
  if (!approver) {
    return err(400, '该事项没有指定审批领导')
  }

  const patchResult = sanitizeAdjustmentPatch(pendingAdjustment)
  if (!patchResult.ok) {
    return err(400, patchResult.message)
  }
  const patch = patchResult.patch

  const effectiveDeptId = Number(patch.departmentId ?? workItem.departmentId)
  if (!effectiveDeptId) {
    return err(400, '请指定责任部门')
  }

  const department = await findDepartmentById(effectiveDeptId)
  if (!department) {
    return err(400, '责任部门不存在')
  }

  if (patch.responsibleLeaderMemberId != null || patch.responsiblePersonMemberId != null) {
    const assignments: MemberAssignment[] = []
    if (patch.responsibleLeaderMemberId != null) {
      assignments.push({
        memberId: Number(patch.responsibleLeaderMemberId),
        role: 'leader',
        departmentId: effectiveDeptId,
      })
    }
    if (patch.responsiblePersonMemberId != null) {
      assignments.push({
        memberId: Number(patch.responsiblePersonMemberId),
        role: 'person',
        departmentId: effectiveDeptId,
      })
    }
    const errors = await validateMemberAssignments(assignments)
    if (errors.length > 0) {
      return err(400, errors[0].message)
    }
  }

  const cooperators = Array.isArray(patch.cooperators) ? patch.cooperators : []
  if (cooperators.some((c: any) => c.leaderMemberId != null || c.personMemberId != null)) {
    const coopAssignments: MemberAssignment[] = []
    for (const c of cooperators) {
      if (c.leaderMemberId != null) {
        coopAssignments.push({
          memberId: Number(c.leaderMemberId),
          role: 'leader',
          departmentId: Number(c.departmentId),
        })
      }
      if (c.personMemberId != null) {
        coopAssignments.push({
          memberId: Number(c.personMemberId),
          role: 'person',
          departmentId: Number(c.departmentId),
        })
      }
    }
    const coopErrors = await validateMemberAssignments(coopAssignments)
    if (coopErrors.length > 0) {
      return err(400, `配合方: ${coopErrors[0].message}`)
    }
  }

  const beforeSnapshot = buildAdjustmentBeforeSnapshot(workItem)
  const changedFields = getChangedAdjustmentFields(
    beforeSnapshot as Record<string, unknown>,
    patch as Record<string, unknown>,
  )
  if (changedFields.length === 0) {
    return err(400, '调整内容没有变更，无需提交调整申请')
  }

  await createAdjustment({
    workItemId,
    reason: adjustReason,
    patch: patch as Prisma.InputJsonObject,
    beforeSnapshot: beforeSnapshot as Prisma.InputJsonObject,
    requestedById: user.id,
  })

  await updateWorkItem(workItemId, {
    status: WorkItemStatus.ADJUSTING,
    action: ActionType.ADJUST,
    adjustReason,
    beforeApprovalStatus: oldStatus,
    approvalType: ApprovalType.ADJUST,
    currentApproverId: approver.currentApproverId,
    currentApproverRole: approver.currentApproverRole,
    rejectReason: null,
    rejectedFromStatus: null,
  })

  await createWorkflowRecord({
    workItemId,
    actionType: 'adjust',
    operatorId: user.id,
    operatorRole: permUser.role,
    statusBefore: oldStatus,
    statusAfter: WorkItemStatus.ADJUSTING,
    comment: comment || '申请调整',
  })
  await createOperationLog({
    userId: user.id,
    userName: user.name,
    userRole: permUser.role,
    operationType: 'adjust',
    module: 'workflow',
    description: `申请调整: ${workItem.title}`,
    targetId: workItemId,
  })

  return ok()
}
