import { isSupervisionAdmin } from '@/lib/server-auth'
import { getResponsibleDepartmentIds } from '@/lib/server-permissions'
import {
  findWorksForCompletionRate,
  findBusinessDepartments,
  createCompletionRateLog,
} from '@/features/excel/infrastructure/completion-rate.repository'
import { generateCompletionRateBuffer } from '@/features/excel/infrastructure/completion-rate-exporter'
import { calculateDepartmentStats } from '@/shared/completion-rate.rules'
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

  const works = await findWorksForCompletionRate(
    departmentId,
    dateFilter,
  )

  const responsibleWorks = works.filter((work) =>
    getResponsibleDepartmentIds(work).includes(departmentId),
  )

  const stats = calculateDepartmentStats(responsibleWorks)

  return { departmentName, ...stats }
}

export async function exportCompletionRateUseCase(
  input: ExportCompletionRateInput,
): Promise<ExportCompletionRateResult> {
  const { currentUser, startDate, endDate } = input

  if (
    !isSupervisionAdmin(
      currentUser.role as import('@prisma/client').Role,
    )
  ) {
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
    stats.push(
      await getDepartmentStats(
        dept.id,
        dept.name,
        sDate,
        eDate,
      ),
    )
  }

  const { buffer, fileName } = generateCompletionRateBuffer(stats)

  createCompletionRateLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
  })

  return { kind: 'ok', buffer, fileName }
}
