import type { WorkItem } from '@prisma/client'
import { normalizeAssessmentYear } from '@/features/works/domain/work-structure.rules'

export const ADJUSTMENT_PATCH_FIELDS = [
  'title',
  'assessmentYear',
  'workItem',
  'businessCategory',
  'workNode',
  'completeForm',
  'isInnovation',
  'departmentId',
  'responsibleLeader',
  'responsiblePerson',
  'responsibleLeaderUserId',
  'responsiblePersonUserId',
  'cooperators',
  'workPlan',
  'planCompleteTime',
  'progress',
  'nodes',
  'proposedScene',
  'formedTime',
] as const

export type AdjustmentPatchField = (typeof ADJUSTMENT_PATCH_FIELDS)[number]
export type AdjustmentPatch = Partial<Record<AdjustmentPatchField, unknown>>

const ADJUSTMENT_PATCH_FIELD_SET = new Set<string>(ADJUSTMENT_PATCH_FIELDS)
const TEXT_FIELDS = new Set<AdjustmentPatchField>([
  'title',
  'workItem',
  'businessCategory',
  'workNode',
  'completeForm',
  'responsibleLeader',
  'responsiblePerson',
  'workPlan',
  'planCompleteTime',
  'progress',
  'proposedScene',
  'formedTime',
])
const NUMBER_FIELDS = new Set<AdjustmentPatchField>([
  'assessmentYear',
  'departmentId',
  'responsibleLeaderUserId',
  'responsiblePersonUserId',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toDateString(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
}

function toDateTime(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  return new Date(`${value}T00:00:00.000Z`)
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value !== 'string') return value as T
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizePatchValue(field: AdjustmentPatchField, value: unknown) {
  if (TEXT_FIELDS.has(field)) {
    return typeof value === 'string' ? value : value == null ? null : String(value)
  }

  if (NUMBER_FIELDS.has(field)) {
    if (value == null || value === '') return null
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
  }

  if (field === 'isInnovation') return Boolean(value)
  if (field === 'cooperators') return Array.isArray(value) ? value : []
  if (field === 'nodes') return Array.isArray(value) ? value : []

  return value ?? null
}

export function sanitizeAdjustmentPatch(
  input: unknown,
): { ok: true; patch: AdjustmentPatch } | { ok: false; message: string } {
  if (!isRecord(input)) {
    return { ok: false, message: '请提供拟调整内容' }
  }

  const patch: AdjustmentPatch = {}
  for (const [field, value] of Object.entries(input)) {
    if (!ADJUSTMENT_PATCH_FIELD_SET.has(field)) continue
    const patchField = field as AdjustmentPatchField
    if (patchField === 'departmentId' && (value == null || value === '')) {
      return { ok: false, message: '责任部门不能为空' }
    }
    if (patchField === 'assessmentYear' && !normalizeAssessmentYear(value)) {
      return { ok: false, message: '请选择有效年度' }
    }
    patch[patchField] = normalizePatchValue(patchField, value)
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: '请提供拟调整内容' }
  }

  return { ok: true, patch }
}

export function buildAdjustmentBeforeSnapshot(
  workItem: Pick<
    WorkItem,
    | 'title'
    | 'assessmentYear'
    | 'workItem'
    | 'businessCategory'
    | 'workNode'
    | 'completeForm'
    | 'isInnovation'
    | 'departmentId'
    | 'responsibleLeader'
    | 'responsiblePerson'
    | 'responsibleLeaderUserId'
    | 'responsiblePersonUserId'
    | 'cooperators'
    | 'workPlan'
    | 'planCompleteTime'
    | 'progress'
    | 'nodes'
    | 'proposedScene'
    | 'formedTime'
  >,
): AdjustmentPatch {
  return {
    title: workItem.title,
    assessmentYear: workItem.assessmentYear,
    workItem: workItem.workItem,
    businessCategory: workItem.businessCategory,
    workNode: workItem.workNode,
    completeForm: workItem.completeForm,
    isInnovation: workItem.isInnovation,
    departmentId: workItem.departmentId,
    responsibleLeader: workItem.responsibleLeader,
    responsiblePerson: workItem.responsiblePerson,
    responsibleLeaderUserId: workItem.responsibleLeaderUserId,
    responsiblePersonUserId: workItem.responsiblePersonUserId,
    cooperators: parseJsonField(workItem.cooperators, []),
    workPlan: workItem.workPlan,
    planCompleteTime: toDateString(workItem.planCompleteTime),
    progress: workItem.progress,
    nodes: parseJsonField(workItem.nodes, []),
    proposedScene: workItem.proposedScene,
    formedTime: toDateString(workItem.formedTime),
  }
}

export function buildAdjustmentWorkUpdateData(patch: AdjustmentPatch): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}

  for (const field of ADJUSTMENT_PATCH_FIELDS) {
    if (!(field in patch)) continue
    const value = patch[field]

    if (field === 'formedTime' || field === 'planCompleteTime') {
      updateData[field] = toDateTime(value)
    } else if (field === 'nodes') {
      updateData.nodes = JSON.stringify(Array.isArray(value) ? value : [])
    } else {
      updateData[field] = value
    }
  }

  return updateData
}

export function buildAdjustHistoryEntry(params: {
  beforeSnapshot: AdjustmentPatch
  patch: AdjustmentPatch
  reason: string
  approvedBy: string
}) {
  return {
    id: Date.now(),
    reason: params.reason,
    field: 'planCompleteTime',
    fromTime: params.beforeSnapshot.planCompleteTime ?? null,
    toTime: params.patch.planCompleteTime ?? params.beforeSnapshot.planCompleteTime ?? null,
    requestedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    approvedBy: params.approvedBy,
    beforeSnapshot: params.beforeSnapshot,
    patch: params.patch,
  }
}
