import type { CurrentUser } from '@/shared/auth/current-user'
import { Role } from '@prisma/client'
import { canEditWorkItem } from '@/features/works/domain/work.permissions'
import type { PermissionUser } from '@/features/works/domain/work.permissions'
import {
  findWorkForUpdateById,
  findMembersByIds,
  updateWorkItem,
  createWorkUpdateOperationLog,
} from '@/features/works/infrastructure/work.repository'
interface UpdateWorkResponseDto { id: number; title: string; type: string; departmentId: number | null; departmentName: string; status: string; updatedAt: string }

function toUpdateWorkResponse(work: any): UpdateWorkResponseDto {
  return {
    id: work.id, title: work.title,
    type: work.type === 'PRIORITY' ? '重点' : work.type === 'MAIN' ? '主要' : '待办',
    departmentId: work.departmentId,
    departmentName: work.department?.name || '-',
    status: work.status,
    updatedAt: work.updatedAt.toISOString(),
  }
}

export interface UpdateWorkBody {
  title?: string
  departmentId?: number
  workItem?: string
  workNode?: string
  businessCategory?: string
  completeForm?: string
  isInnovation?: boolean
  responsibleLeader?: string
  responsiblePerson?: string
  responsibleLeaderMemberId?: number
  responsiblePersonMemberId?: number
  proposedLeaderId?: number
  proposedScene?: string
  formedTime?: string
  cooperators?: unknown
  workPlan?: string
  planCompleteTime?: string
  progress?: string
  approvalLeaderId?: number
  nodes?: unknown
}

export interface UpdateWorkInput {
  currentUser: CurrentUser
  workId: number
  body: UpdateWorkBody
}

function convertToDateTime(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00.000Z')
}

export type UpdateWorkResult =
  | { kind: 'ok'; data: ReturnType<typeof toUpdateWorkResponse> }
  | { kind: 'error'; status: number; message: string }

export async function updateWorkUseCase(
  input: UpdateWorkInput,
): Promise<UpdateWorkResult> {
  const { currentUser, workId, body } = input

  const work = await findWorkForUpdateById(workId)

  if (!work) {
    return { kind: 'error', status: 404, message: '事项不存在' }
  }

  if (!canEditWorkItem(currentUser as PermissionUser, work)) {
    return {
      kind: 'error',
      status: 403,
      message: '只能修改草稿或已退回状态的本权限事项',
    }
  }

  // Validate member IDs if provided
  const effectiveDeptId = body.departmentId ?? work.departmentId
  if (body.responsibleLeaderMemberId != null || body.responsiblePersonMemberId != null) {
    const memberIds = [body.responsibleLeaderMemberId, body.responsiblePersonMemberId].filter((id): id is number => id != null)
    const members = await findMembersByIds(memberIds)
    const memberMap = new Map(members.map((m) => [m.id, m]))

    for (const id of memberIds) {
      const member = memberMap.get(id)
      if (!member) {
        return { kind: 'error', status: 400, message: `人员 ID ${id} 不存在` }
      }
      if (!member.isActive) {
        return { kind: 'error', status: 400, message: `人员 "${member.name}" 已停用` }
      }
      if (member.departmentId !== effectiveDeptId) {
        return { kind: 'error', status: 400, message: `人员 "${member.name}" 不属于目标部门` }
      }
    }

    if (body.responsibleLeaderMemberId != null) {
      const leader = memberMap.get(body.responsibleLeaderMemberId)!
      if (!leader.isLeader) {
        return { kind: 'error', status: 400, message: `"${leader.name}" 不是部门领导` }
      }
    }
  }

  const updateData: Record<string, unknown> = {}
  if (body.title !== undefined) updateData.title = body.title
  if (body.workItem !== undefined) updateData.workItem = body.workItem
  if (body.workNode !== undefined) updateData.workNode = body.workNode
  if (body.businessCategory !== undefined)
    updateData.businessCategory = body.businessCategory
  if (body.completeForm !== undefined)
    updateData.completeForm = body.completeForm
  if (body.isInnovation !== undefined)
    updateData.isInnovation = body.isInnovation
  if (body.responsibleLeader !== undefined)
    updateData.responsibleLeader = body.responsibleLeader
  if (body.proposedLeaderId !== undefined)
    updateData.proposedLeaderId = body.proposedLeaderId || null
  if (body.proposedScene !== undefined)
    updateData.proposedScene = body.proposedScene
  if (body.formedTime !== undefined)
    updateData.formedTime = convertToDateTime(body.formedTime)
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
  if (body.approvalLeaderId !== undefined)
    updateData.approvalLeaderId = body.approvalLeaderId || null
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

  return { kind: 'ok', data: toUpdateWorkResponse(updatedWork) }
}
