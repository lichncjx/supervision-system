import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Role, WorkItemStatus } from '@prisma/client'
import { canEditWorkItem } from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import {
  findWorkForUpdateById,
  updateWorkItem,
  createWorkUpdateOperationLog,
} from '@/features/works/infrastructure/work.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { findUserById as prismaFindUserById } from '@/features/users/infrastructure/user.repository'
import { isDeptLeader, isDeptManager } from '@/features/users/domain/role.rules'
import { validateMemberAssignments, type MemberAssignment } from '@/features/members/domain/member.rules'
import { toWorkDto } from '@/features/works/application/work.mapper'
import {
  isPriorityOrMainWorkType,
  normalizeAssessmentYear,
  validateStructuredWorkFields,
} from '@/features/works/domain/work-structure.rules'
import type { WorkDto } from './work.dto'
import { type ErrResult, type Result, err, ok } from '@/shared/result'

export interface UpdateWorkBody {
  title?: string | null
  assessmentYear?: number | null
  departmentId?: number
  workItem?: string | null
  workNode?: string | null
  businessCategory?: string | null
  completeForm?: string | null
  isInnovation?: boolean | null
  responsibleLeader?: string | null
  responsiblePerson?: string | null
  responsibleLeaderUserId?: number | null
  responsiblePersonUserId?: number | null
  proposedLeader?: string | null
  proposedLeaderId?: number | null
  proposedScene?: string | null
  formedTime?: string | null
  cooperators?: unknown
  workPlan?: string | null
  planCompleteTime?: string | null
  progress?: string | null
  approvalLeaderId?: number | null
  nodes?: unknown
}

export interface UpdateWorkInput {
  currentUser: BaseCurrentUser
  workId: number
  body: UpdateWorkBody
}

function convertToDateTime(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00.000Z')
}

export async function updateWorkUseCase(input: UpdateWorkInput): Promise<Result<WorkDto>> {
  const { currentUser, workId, body } = input

  const work = await findWorkForUpdateById(workId)

  if (!work) {
    return err(404, '事项不存在')
  }

  if (!canEditWorkItem(toPermissionUser(currentUser), work)) {
    return err(403, '只能修改草稿或已退回状态的本权限事项')
  }

  // Guard: IN_PROGRESS 及审批态下，普通更新接口不允许修改责任人
  // 责任人调整必须走 ADJUSTING 审批
  const terminalOrApproving =
    work.status === WorkItemStatus.IN_PROGRESS ||
    work.status === WorkItemStatus.PROPOSING ||
    work.status === WorkItemStatus.ADJUSTING ||
    work.status === WorkItemStatus.CANCELLING ||
    work.status === WorkItemStatus.COMPLETING ||
    work.status === WorkItemStatus.COMPLETED ||
    work.status === WorkItemStatus.CANCELLED

  if (
    terminalOrApproving &&
    (body.responsibleLeaderUserId !== undefined ||
     body.responsiblePersonUserId !== undefined)
  ) {
    return err(403, '进行中或审批中的事项不能通过编辑接口修改责任人，请使用调整审批')
  }

  const effectiveDeptId = body.departmentId ?? work.departmentId
  const departmentChanged =
    body.departmentId !== undefined &&
    body.departmentId !== work.departmentId
  const effectiveLeaderUserId =
    body.responsibleLeaderUserId !== undefined
      ? body.responsibleLeaderUserId
      : departmentChanged
        ? work.responsibleLeaderUserId
        : undefined
  const effectivePersonUserId =
    body.responsiblePersonUserId !== undefined
      ? body.responsiblePersonUserId
      : departmentChanged
        ? work.responsiblePersonUserId
        : undefined

  async function validateResponsibleUser(
    userId: number | null | undefined,
    label: '责任领导' | '责任人',
  ): Promise<ErrResult | null> {
    if (userId == null) return null
    const responsibleUser = await prismaFindUserById(userId)
    if (!responsibleUser || !responsibleUser.isActive) {
      return err(400, `${label}用户不存在或已禁用`)
    }
    if (responsibleUser.departmentId !== effectiveDeptId) {
      return err(400, `${label}不属于该责任部门`)
    }
    if (label === '责任领导' && !isDeptLeader(responsibleUser.role)) {
      return err(400, '责任领导必须是部门领导')
    }
    if (label === '责任人' && !isDeptManager(responsibleUser.role)) {
      return err(400, '责任人不能是部门领导')
    }
    return null
  }

  const leaderError = await validateResponsibleUser(effectiveLeaderUserId, '责任领导')
  if (leaderError) return leaderError
  const personError = await validateResponsibleUser(effectivePersonUserId, '责任人')
  if (personError) return personError

  // Validate cooperator member IDs
  const cooperators = Array.isArray(body.cooperators) ? body.cooperators : []
  if (cooperators.some((c: any) => c.leaderMemberId != null || c.personMemberId != null)) {
    const coopAssignments: MemberAssignment[] = []
    for (const c of cooperators) {
      if (c.leaderMemberId != null) {
        coopAssignments.push({
          memberId: c.leaderMemberId,
          role: 'leader',
          departmentId: c.departmentId,
        })
      }
      if (c.personMemberId != null) {
        coopAssignments.push({
          memberId: c.personMemberId,
          role: 'person',
          departmentId: c.departmentId,
        })
      }
    }
    const coopErrors = await validateMemberAssignments(coopAssignments)
    if (coopErrors.length > 0) {
      return err(400, `配合方: ${coopErrors[0].message}`)
    }
  }

  const updateData: Record<string, unknown> = {}
  const isStructuredWork = isPriorityOrMainWorkType(work.type)
  const hasStructureChange =
    body.workItem !== undefined || body.workNode !== undefined

  if (isStructuredWork && hasStructureChange) {
    const structuredFields = validateStructuredWorkFields({
      workItem: body.workItem !== undefined ? body.workItem : work.workItem,
      workNode: body.workNode !== undefined ? body.workNode : work.workNode,
    })
    if (!structuredFields.ok) return err(400, structuredFields.message)

    updateData.workItem = structuredFields.workItem
    updateData.workNode = structuredFields.workNode
    updateData.title = structuredFields.title
  }

  if (body.assessmentYear !== undefined) {
    const assessmentYear = normalizeAssessmentYear(body.assessmentYear)
    if (!assessmentYear) return err(400, '请选择有效年度')
    updateData.assessmentYear = assessmentYear
  }
  if (body.departmentId !== undefined) {
    const dept = await findDepartmentById(body.departmentId)
    if (!dept) {
      return err(400, '部门不存在')
    }
    updateData.departmentId = body.departmentId
  }
  if (body.title !== undefined && !isStructuredWork)
    updateData.title = body.title
  if (body.workItem !== undefined && !isStructuredWork)
    updateData.workItem = body.workItem
  if (body.workNode !== undefined && !isStructuredWork)
    updateData.workNode = body.workNode
  if (body.businessCategory !== undefined)
    updateData.businessCategory = body.businessCategory
  if (body.completeForm !== undefined)
    updateData.completeForm = body.completeForm
  if (body.isInnovation !== undefined)
    updateData.isInnovation = body.isInnovation
  if (body.proposedLeaderId !== undefined)
    updateData.proposedLeaderId = body.proposedLeaderId ? Number(body.proposedLeaderId) : null
  if (body.approvalLeaderId !== undefined)
    updateData.approvalLeaderId = body.approvalLeaderId ? Number(body.approvalLeaderId) : null
  if (body.proposedScene !== undefined)
    updateData.proposedScene = body.proposedScene
  if (body.formedTime !== undefined)
    updateData.formedTime = convertToDateTime(body.formedTime)
  if (body.responsibleLeader !== undefined)
    updateData.responsibleLeader = body.responsibleLeader
  if (body.responsiblePerson !== undefined)
    updateData.responsiblePerson = body.responsiblePerson
  if (body.responsibleLeaderUserId !== undefined)
    updateData.responsibleLeaderUserId = body.responsibleLeaderUserId
  if (body.responsiblePersonUserId !== undefined)
    updateData.responsiblePersonUserId = body.responsiblePersonUserId
  if (body.cooperators !== undefined)
    updateData.cooperators = body.cooperators
  if (body.workPlan !== undefined)
    updateData.workPlan = body.workPlan
  if (body.planCompleteTime !== undefined)
    updateData.planCompleteTime = convertToDateTime(body.planCompleteTime)
  if (body.progress !== undefined)
    updateData.progress = body.progress
  if (body.nodes !== undefined)
    updateData.nodes = JSON.stringify(body.nodes)

  const updatedWork = await updateWorkItem(workId, updateData)

  await createWorkUpdateOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role as Role,
    workId: updatedWork.id,
    workType: updatedWork.type,
    workTitle: updatedWork.title,
  })

  return ok(toWorkDto(updatedWork))
}
