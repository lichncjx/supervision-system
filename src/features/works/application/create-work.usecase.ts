import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Role, WorkItemType, WorkItemStatus } from '@prisma/client'
import { createWorkItem, createWorkOperationLog } from '@/features/works/infrastructure/work.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import { validateMemberAssignments, type MemberAssignment } from '@/features/members/domain/member.rules'
import { toWorkDto } from '@/features/works/application/work.mapper'
import type { WorkDto } from './work.dto'
import { type Result, err, ok } from '@/shared/result'

export interface CreateWorkBody {
  type: string
  departmentId: number | null
  title?: string | null
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

export interface CreateWorkInput {
  currentUser: BaseCurrentUser
  body: CreateWorkBody
}

const ROLES_CAN_CREATE_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR]
const ROLES_CAN_CREATE_TODO_ONLY: Role[] = [Role.VICE_PRESIDENT, Role.PRESIDENT]
const ROLES_CAN_CREATE_DEPT: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]

function convertToDateTime(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00.000Z')
}

function processNodes(nodes: any[]) {
  return nodes.map((node) => ({
    ...node,
    completeTime: node.completeTime
      ? new Date(node.completeTime + 'T00:00:00.000Z').toISOString()
      : null,
    children: node.children
      ? node.children.map((child: any) => ({
        ...child,
        completeTime: child.completeTime
          ? new Date(child.completeTime + 'T00:00:00.000Z').toISOString()
          : null,
      }))
      : [],
  }))
}

export async function createWorkUseCase(input: CreateWorkInput): Promise<Result<WorkDto>> {
  const { currentUser, body } = input
  const departmentId = body.departmentId

  let workType: WorkItemType
  if (body.type === '重点' || body.type === 'PRIORITY' || body.type === 'priority') {
    workType = WorkItemType.PRIORITY
  } else if (body.type === '主要' || body.type === 'MAIN' || body.type === 'main') {
    workType = WorkItemType.MAIN
  } else if (body.type === '待办' || body.type === 'TODO' || body.type === 'todo') {
    workType = WorkItemType.TODO
  } else {
    return err(400, '无效的事项类型')
  }

  if (!ROLES_CAN_CREATE_ALL.includes(currentUser.role as Role)) {
    if (
      ROLES_CAN_CREATE_TODO_ONLY.includes(currentUser.role as Role) &&
      workType !== WorkItemType.TODO
    ) {
      return err(403, '公司领导只能创建待办事项')
    }

    if (ROLES_CAN_CREATE_DEPT.includes(currentUser.role as Role)) {
      if (departmentId !== currentUser.departmentId) {
        return err(403, '只能创建本部门事项')
      }
    }
  }

  if (!departmentId) {
    return err(400, '请指定责任部门')
  }

  const department = await findDepartmentById(departmentId)

  if (!department) {
    return err(400, '责任部门不存在')
  }

  // Validate member IDs if provided
  if (body.responsibleLeaderMemberId != null || body.responsiblePersonMemberId != null) {
    const assignments: MemberAssignment[] = []
    if (body.responsibleLeaderMemberId != null) {
      assignments.push({ memberId: body.responsibleLeaderMemberId, role: 'leader', departmentId })
    }
    if (body.responsiblePersonMemberId != null) {
      assignments.push({ memberId: body.responsiblePersonMemberId, role: 'person', departmentId })
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

  const workData = {
    type: workType,
    title: body.title || body.workItem || '未命名事项',
    departmentId,
    creatorId: currentUser.id,
    status: WorkItemStatus.DRAFT,
    workItem: body.workItem,
    workNode: body.workNode,
    businessCategory: body.businessCategory,
    completeTime: null,
    completeForm: body.completeForm,
    isInnovation: body.isInnovation || false,
    responsibleLeader: body.responsibleLeader,
    responsiblePerson: body.responsiblePerson,
    responsibleLeaderMemberId: body.responsibleLeaderMemberId,
    responsiblePersonMemberId: body.responsiblePersonMemberId,
    proposedLeaderId: body.proposedLeaderId ? Number(body.proposedLeaderId) : null,
    approvalLeaderId: body.approvalLeaderId ? Number(body.approvalLeaderId) : null,
    proposedScene: body.proposedScene,
    formedTime: convertToDateTime(body.formedTime),
    cooperators: body.cooperators || undefined,
    workPlan: body.workPlan,
    planCompleteTime: convertToDateTime(body.planCompleteTime),
    progress: body.progress,
    nodes: body.nodes ? JSON.stringify(processNodes(body.nodes as any[])) : null,
  }

  if (workData.proposedLeaderId && !workData.approvalLeaderId) {
    workData.approvalLeaderId = workData.proposedLeaderId
  }

  const work = await createWorkItem(workData as any)

  await createWorkOperationLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role as Role,
    workId: work.id,
    workType: work.type,
    workTitle: work.title,
  })

  return ok(toWorkDto(work))
}
