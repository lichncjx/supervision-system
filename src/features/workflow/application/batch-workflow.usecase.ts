import {
  ActionType,
  ApprovalType,
  Prisma,
  Role,
  WorkItemStatus,
  WorkItemType,
  type WorkItem,
} from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { err, ok, type Result } from '@/shared/result'
import { prisma } from '@/shared/db/prisma'
import { canApproveWorkItem } from '@/features/works/domain/work.permissions'
import { toPermissionUser } from '@/features/works/domain/work-permission-user.mapper'
import { isCompanyLevel } from '@/features/users/domain/role.rules'
import {
  getNextApprovalAssignment,
  getProposalFirstApprover,
  getTargetStatus,
  canUserSubmit,
  type NextApprovalAssignmentResult,
} from '@/features/workflow/domain/workflow.rules'

export const MAX_BATCH_WORKFLOW_ITEMS = 200

export type BatchWorkflowAction = 'submit' | 'approve'

export interface BatchWorkflowItemRef {
  id: number
  updatedAt: string
}

export interface BatchWorkflowInput {
  currentUser: BaseCurrentUser
  action: BatchWorkflowAction
  items: BatchWorkflowItemRef[]
  nextApproverId?: number | null
  comment?: string | null
}

export interface BatchWorkflowPreview {
  count: number
  action: BatchWorkflowAction
  assessmentYear: number
  type: WorkItemType
  workItem: string
  route: 'next' | 'complete'
}

type WorkflowDb = Pick<Prisma.TransactionClient, 'workItem' | 'user'>

interface BatchWorkflowPlan extends BatchWorkflowPreview {
  works: WorkItem[]
  nextAssignments: Map<number, NextApprovalAssignmentResult>
}

class BatchWorkflowError extends Error {
  constructor(readonly result: Result<BatchWorkflowPreview>) {
    super(result.ok ? 'Unexpected batch workflow result' : result.message)
  }
}

function validateReferences(items: BatchWorkflowItemRef[]): Result<BatchWorkflowItemRef[]> {
  if (!Array.isArray(items) || items.length < 2) {
    return err(400, '请至少选择 2 条工作节点进行批量操作')
  }
  if (items.length > MAX_BATCH_WORKFLOW_ITEMS) {
    return err(400, `单次批量操作最多 ${MAX_BATCH_WORKFLOW_ITEMS} 条工作节点`)
  }

  const ids = new Set<number>()
  for (const item of items) {
    const updatedAt = new Date(item.updatedAt)
    if (!Number.isInteger(item.id) || item.id <= 0 || Number.isNaN(updatedAt.getTime())) {
      return err(400, '批量操作参数不合法')
    }
    if (ids.has(item.id)) return err(400, '批量操作不能包含重复的工作节点')
    ids.add(item.id)
  }
  return ok(items)
}

function routeSignature(assignment: NextApprovalAssignmentResult, work: WorkItem): string {
  if (assignment.kind === 'complete') return 'complete'
  if (assignment.kind === 'missingCompanyLeader') return 'missing'

  // 角色审批节点没有指定到单一用户时，责任部门不同即代表不同路由。
  const departmentScope = assignment.approver.currentApproverId
    ? ''
    : `:${work.departmentId ?? 'none'}`
  return `next:${assignment.approver.currentApproverId ?? 'role'}:${assignment.approver.currentApproverRole}${departmentScope}`
}

async function buildBatchWorkflowPlan(
  db: WorkflowDb,
  input: BatchWorkflowInput,
  works: WorkItem[],
): Promise<Result<BatchWorkflowPlan>> {
  const refs = validateReferences(input.items)
  if (!refs.ok) return refs
  if (works.length !== refs.data.length) {
    return err(404, '部分工作节点不存在或已无权访问')
  }

  const worksById = new Map(works.map((work) => [work.id, work]))
  const selectedWorks: WorkItem[] = []
  for (const ref of refs.data) {
    const work = worksById.get(ref.id)
    if (!work) return err(404, '部分工作节点不存在')
    if (work.updatedAt.getTime() !== new Date(ref.updatedAt).getTime()) {
      return err(409, '工作节点已发生变化，请刷新后重新预检')
    }
    selectedWorks.push(work)
  }

  const first = selectedWorks[0]
  if (
    !first ||
    (first.type !== WorkItemType.PRIORITY && first.type !== WorkItemType.MAIN) ||
    !first.assessmentYear ||
    !first.workItem
  ) {
    return err(400, '仅支持对同一年度、同一类型、同一工作事项下的工作节点批量操作')
  }
  const sameGroup = selectedWorks.every(
    (work) =>
      work.type === first.type &&
      work.assessmentYear === first.assessmentYear &&
      work.workItem === first.workItem,
  )
  if (!sameGroup) {
    return err(400, '批量操作只能选择同一年度、同一类型、同一工作事项下的工作节点')
  }

  if (input.nextApproverId != null) {
    if (!Number.isInteger(input.nextApproverId) || input.nextApproverId <= 0) {
      return err(400, '无效的下一审批人')
    }
    const nextApprover = await db.user.findFirst({
      where: {
        id: input.nextApproverId,
        isActive: true,
        role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
      },
      select: { id: true },
    })
    if (!nextApprover) return err(400, '指定的下一审批人不存在、已禁用或不是公司领导')
  }

  const permissionUser = toPermissionUser(input.currentUser)
  const nextAssignments = new Map<number, NextApprovalAssignmentResult>()
  let route: 'next' | 'complete' | null = null
  let expectedRouteSignature: string | null = null
  const president =
    input.action === 'approve'
      ? await db.user.findFirst({
          where: { role: Role.PRESIDENT, isActive: true },
          orderBy: { id: 'asc' },
          select: { id: true },
        })
      : null

  for (const work of selectedWorks) {
    let assignment: NextApprovalAssignmentResult
    if (input.action === 'submit') {
      if (work.status !== WorkItemStatus.DRAFT) {
        return err(400, '批量提交仅支持草稿状态的工作节点')
      }
      if (!canUserSubmit(work, input.currentUser)) {
        return err(403, '当前用户对所选工作节点不都具备提交权限')
      }
      if (!work.responsiblePersonUserId) {
        return err(400, '所选工作节点均须指定责任人后才能批量提交')
      }
      const approver = getProposalFirstApprover(work, input.currentUser, input.nextApproverId)
      if (!approver) return err(400, '请先指定公司领导后再提交审批')
      assignment = { kind: 'next', approver }
    } else {
      if (work.status !== WorkItemStatus.PROPOSING || work.approvalType !== ApprovalType.PROPOSE) {
        return err(400, '批量审批仅支持处于立项审批中的工作节点')
      }
      if (!canApproveWorkItem(permissionUser, work)) {
        return err(403, '当前用户对所选工作节点不都具备审批权限')
      }
      assignment = getNextApprovalAssignment(
        work,
        ApprovalType.PROPOSE,
        president?.id ?? null,
        input.nextApproverId,
      )
      if (assignment.kind === 'missingCompanyLeader') {
        return err(400, '请先指定公司领导后再审批')
      }
    }

    const signature = routeSignature(assignment, work)
    if (expectedRouteSignature && expectedRouteSignature !== signature) {
      return err(400, '所选工作节点的审批后去向不同，请按路由分别批量操作')
    }
    expectedRouteSignature = signature
    route = assignment.kind === 'next' ? 'next' : 'complete'
    nextAssignments.set(work.id, assignment)
  }

  return ok({
    count: selectedWorks.length,
    action: input.action,
    assessmentYear: first.assessmentYear,
    type: first.type,
    workItem: first.workItem,
    route: route || 'complete',
    works: selectedWorks,
    nextAssignments,
  })
}

async function loadAndPlan(
  db: WorkflowDb,
  input: BatchWorkflowInput,
): Promise<Result<BatchWorkflowPlan>> {
  const refs = validateReferences(input.items)
  if (!refs.ok) return refs
  const works = await db.workItem.findMany({
    where: { id: { in: refs.data.map((item) => item.id) } },
  })
  return buildBatchWorkflowPlan(db, input, works)
}

function toPreview(plan: BatchWorkflowPlan): BatchWorkflowPreview {
  return {
    count: plan.count,
    action: plan.action,
    assessmentYear: plan.assessmentYear,
    type: plan.type,
    workItem: plan.workItem,
    route: plan.route,
  }
}

export async function previewBatchWorkflow(
  input: BatchWorkflowInput,
): Promise<Result<BatchWorkflowPreview>> {
  const result = await loadAndPlan(prisma, input)
  return result.ok ? ok(toPreview(result.data)) : result
}

export async function executeBatchWorkflow(
  input: BatchWorkflowInput,
): Promise<Result<BatchWorkflowPreview>> {
  const preview = await previewBatchWorkflow(input)
  if (!preview.ok) return preview

  try {
    await prisma.$transaction(async (tx) => {
      const plan = await loadAndPlan(tx, input)
      if (!plan.ok) throw new BatchWorkflowError(plan)

      const now = new Date()
      for (const work of plan.data.works) {
        const assignment = plan.data.nextAssignments.get(work.id)
        if (!assignment || assignment.kind === 'missingCompanyLeader') {
          throw new BatchWorkflowError(err(400, '审批路由已发生变化，请重新预检'))
        }

        const updateData: Prisma.WorkItemUncheckedUpdateInput =
          input.action === 'submit'
            ? {
                status: WorkItemStatus.PROPOSING,
                action: ActionType.CREATE,
                beforeApprovalStatus: WorkItemStatus.DRAFT,
                approvalType: ApprovalType.PROPOSE,
                currentApproverId:
                  assignment.kind === 'next' ? assignment.approver.currentApproverId : null,
                currentApproverRole:
                  assignment.kind === 'next' ? assignment.approver.currentApproverRole : null,
                firstSubmitterId: work.firstSubmitterId ?? input.currentUser.id,
                rejectReason: null,
                rejectedFromStatus: null,
                updatedAt: now,
              }
            : assignment.kind === 'next'
              ? {
                  currentApproverId: assignment.approver.currentApproverId,
                  currentApproverRole: assignment.approver.currentApproverRole,
                  updatedAt: now,
                }
              : {
                  status: getTargetStatus(ApprovalType.PROPOSE),
                  beforeApprovalStatus: null,
                  approvalType: null,
                  currentApproverId: null,
                  currentApproverRole: null,
                  ...(isCompanyLevel(input.currentUser.role)
                    ? { approvalLeaderId: input.currentUser.id }
                    : {}),
                  updatedAt: now,
                }

        const updated = await tx.workItem.updateMany({
          where: { id: work.id, updatedAt: work.updatedAt },
          data: updateData,
        })
        if (updated.count !== 1) {
          throw new BatchWorkflowError(err(409, '工作节点已发生变化，请刷新后重新预检'))
        }

        await tx.workflowRecord.create({
          data: {
            workItemId: work.id,
            actionType: input.action,
            initiatorId: input.currentUser.id,
            approvalRole: input.currentUser.role as Role,
            statusBefore: work.status,
            statusAfter:
              input.action === 'submit'
                ? WorkItemStatus.PROPOSING
                : assignment.kind === 'complete'
                  ? WorkItemStatus.IN_PROGRESS
                  : work.status,
            comment: input.comment || (input.action === 'submit' ? '批量提交审批' : '批量审批通过'),
          },
        })
        await tx.operationLog.create({
          data: {
            userId: input.currentUser.id,
            userName: input.currentUser.name,
            userRole: input.currentUser.role as Role,
            action: input.action,
            module: 'workflow',
            targetId: work.id,
            targetType: 'workItem',
            description: `${input.action === 'submit' ? '批量提交事项' : '批量审批通过'}: ${work.title}`,
          },
        })
      }
    })
  } catch (error) {
    if (error instanceof BatchWorkflowError) return error.result
    throw error
  }

  return preview
}
