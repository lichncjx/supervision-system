import { normalizeAssessmentYear } from '@/features/works/domain/work-structure.rules'

const KEY_PREFIX = 'supervision:query-assessment-year:'

function keyFor(userId: number) {
  return `${KEY_PREFIX}${userId}`
}

export function getQueryYearPreference(userId: number): number | null {
  if (typeof window === 'undefined') return null
  return normalizeAssessmentYear(window.localStorage.getItem(keyFor(userId)))
}

export function saveQueryYearPreference(userId: number, year: string | number) {
  const normalized = normalizeAssessmentYear(year)
  if (!normalized || typeof window === 'undefined') return
  window.localStorage.setItem(keyFor(userId), String(normalized))
}

export function resolveQueryAssessmentYear(input: {
  explicitYear?: string | null
  userId: number
  defaultYear: number
}): number {
  return normalizeAssessmentYear(input.explicitYear)
    || getQueryYearPreference(input.userId)
    || input.defaultYear
}
