import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { isGlobalView } from '@/features/users/domain/role.rules'
import { err, ok, type Result } from '@/shared/result'
import type { ExcelExportFile } from '@/features/excel/application/excel-export.types'
import { normalizeAssessmentYear } from '@/features/works/domain/work-structure.rules'
import { getDefaultAssessmentYear } from '@/features/system-settings/application/system-settings.usecase'

export interface ExportCompletionRateInput {
  currentUser: BaseCurrentUser
  year: string | null
}

import { getResponsibleDepartmentIds } from '@/features/works/domain/work.permissions'
import {
  findWorksForCompletionRate,
  createCompletionRateLog,
} from '@/features/excel/infrastructure/completion-rate.repository'
import { findBusinessDepartments } from '@/features/departments/infrastructure/department.repository'
import { generateCompletionRateBuffer } from '@/features/excel/infrastructure/completion-rate-exporter'
import {
  calculateDepartmentStats,
  type CompletionRateStat,
} from '@/features/works/domain/completion-rate.calculator'

async function getDepartmentStats(
  departmentId: number,
  departmentName: string,
  assessmentYear: number,
): Promise<CompletionRateStat> {
  const works = await findWorksForCompletionRate(departmentId, assessmentYear)

  const responsibleWorks = works.filter((work) =>
    getResponsibleDepartmentIds(work).includes(departmentId),
  )

  const stats = calculateDepartmentStats(responsibleWorks)

  return { departmentName, ...stats }
}

export async function exportCompletionRateUseCase(
  input: ExportCompletionRateInput,
): Promise<Result<ExcelExportFile>> {
  const { currentUser, year } = input

  if (!isGlobalView(currentUser.role as import('@prisma/client').Role)) {
    return err(403, '无权导出完成率统计，仅限系统管理员和督办管理员')
  }

  const assessmentYear = normalizeAssessmentYear(year) || await getDefaultAssessmentYear()

  const departments = await findBusinessDepartments()

  const stats: CompletionRateStat[] = []
  for (const dept of departments) {
    stats.push(await getDepartmentStats(dept.id, dept.name, assessmentYear))
  }

  const { buffer, fileName } = generateCompletionRateBuffer(stats, assessmentYear)

  createCompletionRateLog({
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
  })

  return ok({ buffer, fileName })
}
