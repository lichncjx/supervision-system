import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { err, ok, type Result } from '@/shared/result'
import { queryWorksUseCase } from '@/features/works/application/query-works.usecase'
import { normalizeAssessmentYear, normalizeWorkStructureText } from '@/features/works/domain/work-structure.rules'

export interface WorkItemOption {
  workItem: string
  visibleNodeCount: number
}

export interface ListWorkItemOptionsInput {
  currentUser: BaseCurrentUser
  type: string | null
  assessmentYear: string | null
  departmentId: string | null
  keyword: string | null
}

export async function listWorkItemOptionsUseCase(
  input: ListWorkItemOptionsInput,
): Promise<Result<WorkItemOption[]>> {
  const assessmentYear = normalizeAssessmentYear(input.assessmentYear)
  if (!assessmentYear) return err(400, '请选择有效年度')
  if (!input.type || !['priority', 'main'].includes(input.type.toLowerCase())) {
    return err(400, '工作事项候选仅支持重点工作或主要工作')
  }

  const keyword = normalizeWorkStructureText(input.keyword)
  const result = await queryWorksUseCase({
    currentUser: input.currentUser,
    params: {
      type: input.type,
      status: null,
      departmentId: input.departmentId,
      keyword: null,
      assessmentYear: String(assessmentYear),
      workItem: null,
    },
  })
  if (!result.ok) return result

  const options = new Map<string, number>()
  for (const work of result.data) {
    const workItem = normalizeWorkStructureText(work.workItem)
    if (!workItem || (keyword && !workItem.includes(keyword))) continue
    options.set(workItem, (options.get(workItem) || 0) + 1)
  }

  return ok(
    Array.from(options, ([workItem, visibleNodeCount]) => ({ workItem, visibleNodeCount }))
      .sort((left, right) => left.workItem.localeCompare(right.workItem, 'zh-CN')),
  )
}
