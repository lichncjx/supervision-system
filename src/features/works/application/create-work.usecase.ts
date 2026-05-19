import type { CurrentUser } from '@/shared/auth/current-user'
import { Role, WorkItemType, WorkItemStatus } from '@prisma/client'
import {
  createWorkItem,
  createWorkOperationLog,
} from '@/features/works/infrastructure/work.repository'
import { findDepartmentById } from '@/features/departments/infrastructure/department.repository'
import {
  validateMemberAssignments,
  type MemberAssignment,
} from '@/features/members/domain/member.rules'
import { toWorkApiDto } from '@/features/works/application/work-api.mapper'
import type { CreateWorkRequestDto, WorkApiDto } from '@/features/works/shared/work-api.types'

export type CreateWorkBody = CreateWorkRequestDto

export interface CreateWorkInput {
  currentUser: CurrentUser
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

export type CreateWorkResult =
  | { kind: 'ok'; data: WorkApiDto }
  | { kind: 'error'; status: number; message: string }

export async function createWorkUseCase(input: CreateWorkInput): Promise<CreateWorkResult> {
  const { currentUser, body } = input
  const departmentId = body.departmentId
  const rest = body

  let workType: WorkItemType
  if (body.type === '重点' || body.type === 'PRIORITY' || body.type === 'priority') {
    workType = WorkItemType.PRIORITY
  } else if (body.type === '主要' || body.type === 'MAIN' || body.type === 'main') {
    workType = WorkItemType.MAIN
  } else if (body.type === '待办' || body.type === 'TODO' || body.type === 'todo') {
    workType = WorkItemType.TODO
  } else {
    return { kind: 'error', status: 400, message: '无效的事项类型' }
  }

  if (!ROLES_CAN_CREATE_ALL.includes(currentUser.role as Role)) {
    if (
      ROLES_CAN_CREATE_TODO_ONLY.includes(currentUser.role as Role) &&
      workType !== WorkItemType.TODO
    ) {
      return { kind: 'error', status: 403, message: '公司领导只能创建待办事项' }
    }

    if (ROLES_CAN_CREATE_DEPT.includes(currentUser.role as Role)) {
      if (departmentId !== currentUser.departmentId) {
        return { kind: 'error', status: 403, message: '只能创建本部门事项' }
      }
    }
  }

  if (!departmentId) {
    return { kind: 'error', status: 400, message: '请指定责任部门' }
  }

  const department = await findDepartmentById(departmentId)

  if (!department) {
    return { kind: 'error', status: 400, message: '责任部门不存在' }
  }

  // Validate member IDs if provided
  if (rest.responsibleLeaderMemberId != null || rest.responsiblePersonMemberId != null) {
    const assignments: MemberAssignment[] = []
    if (rest.responsibleLeaderMemberId != null) {
      assignments.push({ memberId: rest.responsibleLeaderMemberId, role: 'leader', departmentId })
    }
    if (rest.responsiblePersonMemberId != null) {
      assignments.push({ memberId: rest.responsiblePersonMemberId, role: 'person', departmentId })
    }
    const errors = await validateMemberAssignments(assignments)
    if (errors.length > 0) {
      return { kind: 'error', status: 400, message: errors[0].message }
    }
  }

  // Validate cooperator member IDs
  const cooperators = Array.isArray(rest.cooperators) ? rest.cooperators : []
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
      return { kind: 'error', status: 400, message: `配合方: ${coopErrors[0].message}` }
    }
  }

  const workData = {
    type: workType,
    title: rest.title || rest.workItem || '未命名事项',
    departmentId,
    creatorId: currentUser.id,
    status: WorkItemStatus.DRAFT,
    workItem: rest.workItem,
    workNode: rest.workNode,
    businessCategory: rest.businessCategory,
    completeTime: null,
    completeForm: rest.completeForm,
    isInnovation: rest.isInnovation || false,
    responsibleLeader: rest.responsibleLeader,
    responsiblePerson: rest.responsiblePerson,
    responsibleLeaderMemberId: rest.responsibleLeaderMemberId,
    responsiblePersonMemberId: rest.responsiblePersonMemberId,
    proposedLeaderId: rest.proposedLeaderId ? Number(rest.proposedLeaderId) : null,
    approvalLeaderId: rest.approvalLeaderId
      ? Number(rest.approvalLeaderId)
      : rest.proposedLeaderId
        ? Number(rest.proposedLeaderId)
        : null,
    proposedScene: rest.proposedScene,
    formedTime: convertToDateTime(rest.formedTime),
    cooperators: rest.cooperators || undefined,
    workPlan: rest.workPlan,
    planCompleteTime: convertToDateTime(rest.planCompleteTime),
    progress: rest.progress,
    nodes: rest.nodes ? JSON.stringify(processNodes(rest.nodes as any[])) : null,
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

  return { kind: 'ok', data: toWorkApiDto(work) }
}
