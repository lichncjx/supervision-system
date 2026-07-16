const TITLE_SEPARATOR = '｜'
const MIN_ASSESSMENT_YEAR = 2000
const MAX_ASSESSMENT_YEAR = 2100
const MAX_TITLE_LENGTH = 200

interface WorkTitleSource {
  type: string
  workItem?: unknown
  workNode?: unknown
  legacyTitle?: unknown
}

export function isPriorityOrMainWorkType(type: string) {
  return ['priority', 'main', 'PRIORITY', 'MAIN', '重点', '主要'].includes(type)
}

export function normalizeWorkStructureText(value: unknown): string {
  return String(value ?? '')
    .replace(/\u3000/g, ' ')
    .trim()
}

export function normalizeAssessmentYear(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const year = Number(value)
  if (!Number.isInteger(year) || year < MIN_ASSESSMENT_YEAR || year > MAX_ASSESSMENT_YEAR) {
    return null
  }
  return year
}

export function buildStructuredWorkTitle(workItem: string, workNode: string): string | null {
  const title = `${workItem}${TITLE_SEPARATOR}${workNode}`
  return title.length <= MAX_TITLE_LENGTH ? title : null
}

/** Derive display/materialized title from authoritative structure fields. */
export function deriveWorkDisplayTitle(source: WorkTitleSource): string {
  const workItem = normalizeWorkStructureText(source.workItem)
  const workNode = normalizeWorkStructureText(source.workNode)
  const legacyTitle = normalizeWorkStructureText(source.legacyTitle)

  if (isPriorityOrMainWorkType(source.type)) {
    if (workItem && workNode) {
      return `${workItem}${TITLE_SEPARATOR}${workNode}`
    }
    return legacyTitle || workItem || '未命名事项'
  }

  return workItem || legacyTitle || '未命名事项'
}

export function validateTodoWorkItem(value: unknown):
  | { ok: true; workItem: string; title: string }
  | { ok: false; message: string } {
  const workItem = normalizeWorkStructureText(value)
  if (!workItem) return { ok: false, message: '请输入待办事项' }
  if (workItem.length > MAX_TITLE_LENGTH) {
    return { ok: false, message: '待办事项不能超过200个字符' }
  }
  return {
    ok: true,
    workItem,
    title: deriveWorkDisplayTitle({ type: 'TODO', workItem }),
  }
}

export function validateStructuredWorkFields(params: {
  workItem: unknown
  workNode: unknown
}):
  | { ok: true; workItem: string; workNode: string; title: string }
  | { ok: false; message: string } {
  const workItem = normalizeWorkStructureText(params.workItem)
  const workNode = normalizeWorkStructureText(params.workNode)

  if (!workItem) return { ok: false, message: '请输入工作事项' }
  if (!workNode) return { ok: false, message: '请输入工作节点' }

  if (!buildStructuredWorkTitle(workItem, workNode)) {
    return { ok: false, message: '工作事项与工作节点组合后的标题不能超过200个字符' }
  }

  const title = deriveWorkDisplayTitle({ type: 'PRIORITY', workItem, workNode })
  return { ok: true, workItem, workNode, title }
}
