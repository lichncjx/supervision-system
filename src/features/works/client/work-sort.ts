import type { Work } from '@/features/works/client/work-view.types'
import { getWorkDueDate } from './work-date.utils'

export function sortWorksByDueDate<T extends Work>(list: T[]) {
  return [...list].sort((a, b) => {
    const da = getWorkDueDate(a)
    const db = getWorkDueDate(b)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return new Date(da).getTime() - new Date(db).getTime()
  })
}
