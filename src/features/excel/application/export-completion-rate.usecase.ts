import { isSupervisionAdmin } from '@/lib/server-auth'
import { getResponsibleDepartmentIds } from '@/lib/server-permissions'
import {
  findWorksForCompletionRate,
  findBusinessDepartments,
  createCompletionRateLog,
} from '@/features/excel/infrastructure/completion-rate.repository'
import { generateCompletionRateBuffer } from '@/features/excel/infrastructure/completion-rate-exporter'
import type {
  ExportCompletionRateInput,
  ExportCompletionRateResult,
  CompletionRateStat,
} from '@/features/excel/presentation/excel.dto'

async function getDepartmentStats(
  departmentId: number,
  departmentName: string,
  startDate?: Date,
  endDate?: Date,
): Promise<CompletionRateStat> {
  const dateFilter: Record<string, unknown> = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    dateFilter.lte = end
  }

  const works = await findWorksForCompletionRate(departmentId, dateFilter)

  const responsibleWorks = works.filter((work) =>
    getResponsibleDepartmentIds(work).includes(departmentId),
  )

  const priority = responsibleWorks.filter(
    (work) => work.type === 'PRIORITY',
  )
  const main = responsibleWorks.filter((work) => work.type === 'MAIN')
  const todo = responsibleWorks.filter((work) => work.type === 'TODO')
  const isCompleted = (work: (typeof responsibleWorks)[number]) =>
    work.status === 'COMPLETED'
  const isCancelled = (work: (typeof responsibleWorks)[number]) =>
    work.status === 'CANCELLED'
  const isOverdue = (work: (typeof responsibleWorks)[number]) => {
    if (isCompleted(work) || isCancelled(work)) return false
    const due =
      work.type === 'TODO' ? work.planCompleteTime : work.completeTime
    return due ? due < new Date() : false
  }

  const priorityTotal = priority.length
  const priorityCompleted = priority.filter(isCompleted).length
  const mainTotal = main.length
  const mainCompleted = main.filter(isCompleted).length
  const todoTotal = todo.length
  const todoCompleted = todo.filter(isCompleted).length
  const cancelled = responsibleWorks.filter(isCancelled).length
  const overdue = responsibleWorks.filter(isOverdue).length

  const total = priorityTotal + mainTotal + todoTotal
  const completed = priorityCompleted + mainCompleted + todoCompleted
  const validTotal = total - cancelled
  const completionRate =
    validTotal > 0
      ? Math.round((completed / validTotal) * 10000) / 100
      : 0

  const priorityRate =
    priorityTotal > 0
      ? Math.round((priorityCompleted / priorityTotal) * 10000) / 100
      : 0
  const mainRate =
    mainTotal > 0
      ? Math.round((mainCompleted / mainTotal) * 10000) / 100
      : 0
  const todoRate =
    todoTotal > 0
      ? Math.round((todoCompleted / todoTotal) * 10000) / 100
      : 0

  return {
    departmentName,
    priorityTotal,
    priorityCompleted,
    priorityRate,
    mainTotal,
    mainCompleted,
    mainRate,
    todoTotal,
    todoCompleted,
    todoRate,
    total,
    completed,
    cancelled,
    overdue,
    completionRate,
  }
}

export async function exportCompletionRateUseCase(
  input: ExportCompletionRateInput,
): Promise<ExportCompletionRateResult> {
  const { currentUser, startDate, endDate } = input

  if (!isSupervisionAdmin(currentUser.role as import('@prisma/client').Role)) {
    return {
      kind: 'error',
      status: 403,
      message:
        '无权导出完成率统计，仅限系统管理员和督办管理员',
    }
  }

  const sDate = startDate ? new Date(startDate) : undefined
  const eDate = endDate ? new Date(endDate) : undefined

  const departments = await findBusinessDepartments()

  const stats: CompletionRateStat[] = []
  for (const dept of departments) {
    stats.push(await getDepartmentStats(dept.id, dept.name, sDate, eDate))
  }

  const { buffer, fileName } = generateCompletionRateBuffer(stats)

  createCompletionRateLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
  })

  return { kind: 'ok', buffer, fileName }
}
