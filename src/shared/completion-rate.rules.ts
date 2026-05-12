export interface CompletionRateWorksInput {
  type: string
  status: string
  completeTime: Date | null
  planCompleteTime: Date | null
}

export function isCompletionRateCompleted(work: CompletionRateWorksInput) {
  return work.status === 'COMPLETED'
}

export function isCompletionRateCancelled(work: CompletionRateWorksInput) {
  return work.status === 'CANCELLED'
}

export function isCompletionRateOverdue(work: CompletionRateWorksInput) {
  if (isCompletionRateCompleted(work) || isCompletionRateCancelled(work))
    return false
  const due =
    work.type === 'TODO' ? work.planCompleteTime : work.completeTime
  return due ? due < new Date() : false
}

export function formatCompletionRate(
  completed: number,
  total: number,
): number {
  if (total <= 0) return 0
  return Math.round((completed / total) * 10000) / 100
}

export interface CompletionRateStat {
  departmentId?: number
  departmentName?: string
  priorityTotal: number
  priorityCompleted: number
  priorityRate: number
  mainTotal: number
  mainCompleted: number
  mainRate: number
  todoTotal: number
  todoCompleted: number
  todoRate: number
  total: number
  completed: number
  cancelled: number
  overdue: number
  completionRate: number
}

export function calculateDepartmentStats(
  works: CompletionRateWorksInput[],
): CompletionRateStat {
  const priority = works.filter((w) => w.type === 'PRIORITY')
  const main = works.filter((w) => w.type === 'MAIN')
  const todo = works.filter((w) => w.type === 'TODO')

  const priorityCompleted = priority.filter(isCompletionRateCompleted).length
  const mainCompleted = main.filter(isCompletionRateCompleted).length
  const todoCompleted = todo.filter(isCompletionRateCompleted).length

  const cancelled = works.filter(isCompletionRateCancelled).length
  const overdue = works.filter(isCompletionRateOverdue).length

  const priorityTotal = priority.length
  const mainTotal = main.length
  const todoTotal = todo.length
  const total = priorityTotal + mainTotal + todoTotal
  const completed = priorityCompleted + mainCompleted + todoCompleted
  const validTotal = total - cancelled

  return {
    priorityTotal,
    priorityCompleted,
    priorityRate: formatCompletionRate(priorityCompleted, priorityTotal),
    mainTotal,
    mainCompleted,
    mainRate: formatCompletionRate(mainCompleted, mainTotal),
    todoTotal,
    todoCompleted,
    todoRate: formatCompletionRate(todoCompleted, todoTotal),
    total,
    completed,
    cancelled,
    overdue,
    completionRate: formatCompletionRate(completed, validTotal),
  }
}
