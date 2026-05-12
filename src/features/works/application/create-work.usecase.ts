import { Role, WorkItemType, WorkItemStatus } from '@prisma/client'
import {
  createWorkItem,
  findDepartmentById,
  createWorkOperationLog,
} from '@/features/works/infrastructure/work.repository'
import { toCreateWorkResponse } from '@/features/works/presentation/work.presenter'
import type { CreateWorkInput } from '@/features/works/presentation/work.dto'

const ROLES_CAN_CREATE_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR]
const ROLES_CAN_CREATE_TODO_ONLY: Role[] = [Role.VICE_PRESIDENT, Role.PRESIDENT]
const ROLES_CAN_CREATE_DEPT: Role[] = [
  Role.DEPARTMENT_MANAGER,
  Role.DEPARTMENT_LEADER,
]

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
  | { kind: 'ok'; data: ReturnType<typeof toCreateWorkResponse> }
  | { kind: 'error'; status: number; message: string }

export async function createWorkUseCase(
  input: CreateWorkInput,
): Promise<CreateWorkResult> {
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

  const workData = {
    type: workType,
    title: rest.title || rest.workItem || '未命名事项',
    departmentId,
    creatorId: currentUser.id,
    status: WorkItemStatus.DRAFT,
    workItem: rest.workItem,
    workNode: rest.workNode,
    businessCategory: rest.businessCategory,
    completeTime: convertToDateTime(rest.completeTime),
    completeForm: rest.completeForm,
    isInnovation: rest.isInnovation || false,
    responsibleLeader: rest.responsibleLeader,
    responsiblePerson: rest.responsiblePerson,
    proposedLeaderId: rest.proposedLeaderId,
    approvalLeaderId: rest.approvalLeaderId || rest.proposedLeaderId,
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

  return { kind: 'ok', data: toCreateWorkResponse(work) }
}
