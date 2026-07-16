import { Prisma, Role, WorkItemType } from '@prisma/client'
import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { prisma } from '@/shared/db/prisma'
import { err, ok, type Result } from '@/shared/result'
import {
  prepareWorkCreateData,
  type CreateWorkBody,
} from '@/features/works/application/create-work.usecase'
import { normalizeWorkStructureText } from '@/features/works/domain/work-structure.rules'

export const MAX_BATCH_DRAFT_ROWS = 200

type BatchDraftNodeInput = Omit<
  CreateWorkBody,
  'type' | 'assessmentYear' | 'workItem' | 'title'
>

export interface CreateWorkDraftsBatchInput {
  currentUser: BaseCurrentUser
  type: 'priority' | 'main'
  assessmentYear: number
  workItem: string
  defaults?: Partial<BatchDraftNodeInput>
  nodes: BatchDraftNodeInput[]
}

export interface CreateWorkDraftsBatchResult {
  count: number
  ids: number[]
}

function workTypeLabel(type: WorkItemType) {
  return type === WorkItemType.PRIORITY ? '重点' : '主要'
}

export async function createWorkDraftsBatchUseCase(
  input: CreateWorkDraftsBatchInput,
): Promise<Result<CreateWorkDraftsBatchResult>> {
  if (!Array.isArray(input.nodes) || input.nodes.length < 2) {
    return err(400, '请至少填写 2 个工作节点；单条创建请使用新增工作节点')
  }
  if (input.nodes.length > MAX_BATCH_DRAFT_ROWS) {
    return err(400, `单次批量新建最多 ${MAX_BATCH_DRAFT_ROWS} 个工作节点`)
  }

  const workItem = normalizeWorkStructureText(input.workItem)
  if (!workItem) return err(400, '请输入工作事项')

  const workNodeNames = new Set<string>()
  const preparedRows: Prisma.WorkItemUncheckedCreateInput[] = []
  for (let index = 0; index < input.nodes.length; index += 1) {
    const node = input.nodes[index]
    const result = await prepareWorkCreateData({
      currentUser: input.currentUser,
      body: {
        ...input.defaults,
        ...node,
        type: input.type,
        assessmentYear: input.assessmentYear,
        workItem,
      },
    })
    if (!result.ok) return err(result.status, `第 ${index + 1} 个工作节点：${result.message}`)

    const workNode = normalizeWorkStructureText(result.data.workNode)
    if (workNodeNames.has(workNode)) {
      return err(400, `第 ${index + 1} 个工作节点与本批次其他节点重复`)
    }
    workNodeNames.add(workNode)
    preparedRows.push(result.data)
  }

  const ids = await prisma.$transaction(async (tx) => {
    const createdIds: number[] = []
    for (const workData of preparedRows) {
      const work = await tx.workItem.create({ data: workData })
      createdIds.push(work.id)
      await tx.operationLog.create({
        data: {
          userId: input.currentUser.id,
          userName: input.currentUser.name,
          userRole: input.currentUser.role as Role,
          action: 'create',
          module: 'works',
          targetId: work.id,
          targetType: 'work_item',
          description: `批量创建${workTypeLabel(work.type)}工作节点：${work.title}`,
        },
      })
    }
    return createdIds
  })

  return ok({ count: ids.length, ids })
}
