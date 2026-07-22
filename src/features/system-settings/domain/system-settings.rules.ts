import { normalizeAssessmentYear } from '@/features/works/domain/work-structure.rules'

export const SYSTEM_SETTING_ID = 1
export const DASHBOARD_NOTICE_MAX_LENGTH = 1000

export function getNaturalAssessmentYear(): number {
  return new Date().getFullYear()
}

export function normalizeDefaultAssessmentYear(value: unknown): number | null {
  return normalizeAssessmentYear(value)
}

export function normalizeDashboardNotice(value: unknown): string | null | undefined {
  if (typeof value !== 'string' || Array.from(value).length > DASHBOARD_NOTICE_MAX_LENGTH) {
    return undefined
  }

  const normalized = value.trim()
  return normalized || null
}
