import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Role } from '@prisma/client'
import { canEditWorkItem } from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import {
  findWorkForUpdateById,
  updateWorkItem,
  createWorkUpdateOperationLog,
} from '@/features/works/infrastructure/work.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import {
  validateMemberAssignments,
  type MemberAssignment,
} from '@/features/members/domain/member.rules'
import { toWorkDto } from '@/features/works/application/work.mapper'
import type { WorkDto } from './work.dto'
import { type Result, err, ok } from '@/shared/result'

export interface UpdateWorkBody {
  title?: string | null
  departmentId?: number
  workItem?: string | null
  workNode?: string | null
  businessCategory?: string | null
  completeForm?: string | null
  isInnovation?: boolean | null
  responsibleLeader?: string | null
  responsiblePerson?: string | null
  responsibleLeaderMemberId?: number | null
  responsiblePersonMemberId?: number | null
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

  // Validate member IDs if provided
  const effectiveDeptId = (body.departmentId ?? work.departmentId)!
  if (body.responsibleLeaderMemberId != null || body.responsiblePersonMemberId != null) {
    const assignments: MemberAssignment[] = []
    if (body.responsibleLeaderMemberId != null) {
      assignments.push({
        memberId: body.responsibleLeaderMemberId,
        role: 'leader',
        departmentId: effectiveDeptId,
      })
    }
    if (body.responsiblePersonMemberId != null) {
      assignments.push({
        memberId: body.responsiblePersonMemberId,
        role: 'person',
        departmentId: effectiveDeptId,
      })
    }
    const errors = await validateMemberAssignments(assignments)
    if (errors.length > 0) {
      return err(400, errors[0].message)
    }
  }

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
  if (body.departmentId !== undefined) {
    const dept = await findDepartmentById(body.departmentId)
    if (!dept) {
      return err(400, '部门不存在')
    }
    updateData.departmentId = body.departmentId
  }
  if (body.title !== undefined)
    updateData.title = body.title
  if (body.workItem !== undefined)
    updateData.workItem = body.workItem
  if (body.workNode !== undefined)
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
  if (body.responsibleLeaderMemberId !== undefined)
    updateData.responsibleLeaderMemberId = body.responsibleLeaderMemberId
  if (body.responsiblePersonMemberId !== undefined)
    updateData.responsiblePersonMemberId = body.responsiblePersonMemberId
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
