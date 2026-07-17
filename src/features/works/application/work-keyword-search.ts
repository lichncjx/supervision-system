import { WorkItemType, type Prisma } from '@prisma/client'
import {
  deriveWorkDisplayTitle,
  normalizeWorkStructureText,
} from '@/features/works/domain/work-structure.rules'

const DISPLAY_TITLE_SEPARATOR = '｜'
const STRUCTURED_WORK_TYPES = [WorkItemType.PRIORITY, WorkItemType.MAIN]

interface WorkKeywordSource {
  type: string
  workItem?: unknown
  workNode?: unknown
  legacyTitle?: unknown
  additionalValues?: unknown[]
}

function getStructuredTitleKeywordParts(keyword: string) {
  const candidates: Array<{ workItem: string | null; workNode: string | null }> = []

  for (
    let index = keyword.indexOf(DISPLAY_TITLE_SEPARATOR);
    index >= 0;
    index = keyword.indexOf(DISPLAY_TITLE_SEPARATOR, index + 1)
  ) {
    const workItem = normalizeWorkStructureText(keyword.slice(0, index))
    const workNode = normalizeWorkStructureText(keyword.slice(index + 1))
    candidates.push({ workItem: workItem || null, workNode: workNode || null })
  }

  return candidates
}

/** Build list-query keyword matching without treating a modern materialized title as authoritative. */
export function buildWorkKeywordWhere(rawKeyword: string | null): Prisma.WorkItemWhereInput | null {
  const keyword = normalizeWorkStructureText(rawKeyword)
  if (!keyword) return null

  const contains = { contains: keyword, mode: 'insensitive' as const }
  const derivedTitleFilters: Prisma.WorkItemWhereInput[] = getStructuredTitleKeywordParts(
    keyword,
  ).map(({ workItem, workNode }) => {
    const conditions: Prisma.WorkItemWhereInput[] = [
      { type: { in: STRUCTURED_WORK_TYPES } },
      { NOT: [{ workItem: null }, { workItem: '' }, { workNode: null }, { workNode: '' }] },
    ]
    if (workItem) {
      conditions.push({ workItem: { endsWith: workItem, mode: 'insensitive' } })
    }
    if (workNode) {
      conditions.push({ workNode: { startsWith: workNode, mode: 'insensitive' } })
    }
    return { AND: conditions }
  })

  const legacyTitleFilter: Prisma.WorkItemWhereInput = {
    AND: [{ title: contains }, { OR: [{ workItem: null }, { workItem: '' }] }],
  }

  return {
    OR: [
      { workItem: contains },
      { workNode: contains },
      { businessCategory: contains },
      { proposedScene: contains },
      { progress: contains },
      { workPlan: contains },
      ...derivedTitleFilters,
      legacyTitleFilter,
    ],
  }
}

/** Match exports against the same derived display title returned by the API. */
export function matchesWorkKeyword(source: WorkKeywordSource, rawKeyword: string | null): boolean {
  const keyword = normalizeWorkStructureText(rawKeyword)
  if (!keyword) return true

  const displayTitle = deriveWorkDisplayTitle({
    type: source.type,
    workItem: source.workItem,
    workNode: source.workNode,
    legacyTitle: source.legacyTitle,
  })
  const normalizedKeyword = keyword.toLocaleLowerCase()

  return [displayTitle, ...(source.additionalValues ?? [])]
    .map(normalizeWorkStructureText)
    .filter(Boolean)
    .some((value) => value.toLocaleLowerCase().includes(normalizedKeyword))
}
