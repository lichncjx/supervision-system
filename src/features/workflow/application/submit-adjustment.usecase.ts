import { ActionType, ApprovalType, Prisma, WorkItemStatus } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { canUserOperate, getProcessFirstApprover } from '@/features/workflow/domain/workflow.rules'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { findWorkForUpdateById } from '@/features/works/infrastructure/work.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { findUserById as prismaFindUserById } from '@/features/users/infrastructure/user.repository'
import { isDeptLeader, isDeptManager } from '@/features/users/domain/role.rules'
import { validateMemberAssignments, type MemberAssignment } from '@/features/members/domain/member.rules'
import { buildAdjustmentBeforeSnapshot, sanitizeAdjustmentPatch } from '@/features/workflow/application/adjustment-patch'
import { getChangedAdjustmentFields } from '@/features/works/domain/work-adjustment-diff'
import { createAdjustmentTransitional, createWorkflowRecord, createOperationLog } from '@/features/workflow/infrastructure/workflow.repository'
import { type Result, err, ok } from '@/shared/result'

function hasPatchField(patch: Record<string, unknown>, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(patch, field)
}

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

  // 进行中事项办理权归属 responsiblePersonUserId，不随全局查看权限放开。
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

  // Validate responsibleLeaderUserId if present in patch
  const hasLeaderPatch = hasPatchField(patch, 'responsibleLeaderUserId')
  const hasPersonPatch = hasPatchField(patch, 'responsiblePersonUserId')

  if (patch.responsibleLeaderUserId != null) {
    const leaderUser = await prismaFindUserById(Number(patch.responsibleLeaderUserId))
    if (!leaderUser || !leaderUser.isActive) {
      return err(400, '责任领导用户不存在或已禁用')
    }
    if (leaderUser.departmentId !== effectiveDeptId) {
      return err(400, '责任领导不属于该责任部门')
    }
    if (!isDeptLeader(leaderUser.role)) {
      return err(400, '责任领导必须是部门领导')
    }
  } else if (
    patch.departmentId != null &&
    !hasLeaderPatch &&
    workItem.responsibleLeaderUserId != null
  ) {
    // Department changed but leader stays — revalidate existing leader against new dept
    const leaderUser = await prismaFindUserById(workItem.responsibleLeaderUserId)
    if (leaderUser && leaderUser.departmentId !== effectiveDeptId) {
      return err(400, '当前责任领导不属于新的责任部门，请同时调整责任领导')
    }
    if (leaderUser && !isDeptLeader(leaderUser.role)) {
      return err(400, '当前责任领导必须是部门领导，请同时调整责任领导')
    }
  }

  // Validate responsiblePersonUserId if present in patch
  if (patch.responsiblePersonUserId != null) {
    const personUser = await prismaFindUserById(Number(patch.responsiblePersonUserId))
    if (!personUser || !personUser.isActive) {
      return err(400, '责任人用户不存在或已禁用')
    }
    if (personUser.departmentId !== effectiveDeptId) {
      return err(400, '责任人不属于该责任部门')
    }
    if (!isDeptManager(personUser.role)) {
      return err(400, '责任人不能是部门领导')
    }
  } else if (
    patch.departmentId != null &&
    !hasPersonPatch &&
    workItem.responsiblePersonUserId != null
  ) {
    // Department changed but person stays — revalidate existing person against new dept
    const personUser = await prismaFindUserById(workItem.responsiblePersonUserId)
    if (personUser && personUser.departmentId !== effectiveDeptId) {
      return err(400, '当前责任人不属于新的责任部门，请同时调整责任人')
    }
    if (personUser && !isDeptManager(personUser.role)) {
      return err(400, '当前责任人不能是部门领导，请同时调整责任人')
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

  const adjustmentRequest = await createAdjustmentTransitional({
    workItemId,
    reason: adjustReason,
    patch: patch as Prisma.InputJsonObject,
    beforeSnapshot: beforeSnapshot as Prisma.InputJsonObject,
    requestedById: user.id,
    updateData: {
      status: WorkItemStatus.ADJUSTING,
      action: ActionType.ADJUST,
      adjustReason,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.ADJUST,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
      rejectReason: null,
      rejectedFromStatus: null,
    },
  })
  if (!adjustmentRequest) {
    return err(409, '该事项当前状态已变化，请刷新后重试')
  }

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
