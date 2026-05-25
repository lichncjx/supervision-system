interface WorkToCalculate {
  type: string
  status: string
  planCompleteTime: Date | null
}

export function isCompleted(work: WorkToCalculate) {
  return work.status === 'COMPLETED'
}

export function isCancelled(work: WorkToCalculate) {
  return work.status === 'CANCELLED'
}

export function isOverdue(work: WorkToCalculate) {
  if (isCompleted(work) || isCancelled(work))
    return false
  const due = work.planCompleteTime
  return due && due < new Date()
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
  works: WorkToCalculate[],
): CompletionRateStat {
  const priority = works.filter((w) => w.type === 'PRIORITY')
  const main = works.filter((w) => w.type === 'MAIN')
  const todo = works.filter((w) => w.type === 'TODO')

  const priorityCompleted = priority.filter(isCompleted).length
  const mainCompleted = main.filter(isCompleted).length
  const todoCompleted = todo.filter(isCompleted).length

  const cancelled = works.filter(isCancelled).length
  const overdue = works.filter(isOverdue).length

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
