import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { err, ok, type Result } from '@/shared/result'
import { queryWorksUseCase } from '@/features/works/application/query-works.usecase'
import { normalizeAssessmentYear, normalizeWorkStructureText } from '@/features/works/domain/work-structure.rules'

export interface WorkItemOption {
  workItem: string
  visibleNodeCount: number
  businessCategoryDefault: string | null
  isInnovationDefault: boolean | null
  businessCategoryConsistent: boolean
  isInnovationConsistent: boolean
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

  const options = new Map<string, {
    visibleNodeCount: number
    businessCategories: Set<string | null>
    innovationValues: Set<boolean>
  }>()
  for (const work of result.data) {
    const workItem = normalizeWorkStructureText(work.workItem)
    if (!workItem || (keyword && !workItem.includes(keyword))) continue

    const option = options.get(workItem) || {
      visibleNodeCount: 0,
      businessCategories: new Set<string | null>(),
      innovationValues: new Set<boolean>(),
    }
    option.visibleNodeCount += 1
    option.businessCategories.add(normalizeWorkStructureText(work.businessCategory) || null)
    option.innovationValues.add(work.isInnovation === true)
    options.set(workItem, option)
  }

  return ok(
    Array.from(options, ([workItem, option]) => ({
      workItem,
      visibleNodeCount: option.visibleNodeCount,
      businessCategoryDefault: option.businessCategories.size === 1
        ? Array.from(option.businessCategories)[0]
        : null,
      isInnovationDefault: option.innovationValues.size === 1
        ? Array.from(option.innovationValues)[0]
        : null,
      businessCategoryConsistent: option.businessCategories.size === 1,
      isInnovationConsistent: option.innovationValues.size === 1,
    }))
      .sort((left, right) => left.workItem.localeCompare(right.workItem, 'zh-CN')),
  )
}
