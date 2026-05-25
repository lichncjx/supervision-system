import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Prisma, WorkItemStatus, WorkItemType } from '@prisma/client'
import { err, ok, type Result } from '@/shared/result'
import { validateAndParseExcel } from '@/features/excel/infrastructure/work-import-parser'
import { findDepartmentsForImport } from '@/features/departments/infrastructure/department.repository'
import { findCompanyLeaders } from '@/features/excel/infrastructure/work-import.repository'
import {
  createImportedWorkItems,
} from '@/features/excel/infrastructure/work-import.repository'
import { validateImportScope } from '@/features/excel/domain/excel-import.rules'

export interface ImportWorksFromExcelInput {
  currentUser: BaseCurrentUser
  type: string
  fileBuffer: Buffer
  fileName: string
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function importWorksFromExcelUseCase(
  input: ImportWorksFromExcelInput,
): Promise<Result<number>> {
  const { currentUser, type, fileBuffer } = input

  const departments = await findDepartmentsForImport()
  const companyLeaders = await findCompanyLeaders()

  const { rows, errors } = await validateAndParseExcel(
    fileBuffer,
    type,
    departments,
    companyLeaders,
  )

  if (errors.length > 0) {
    return err(400, '导入失败，请修正以下错误', undefined, errors)
  }

  if (rows.length === 0) {
    return err(400, '导入失败', undefined, [
      { row: 0, field: 'file', value: '', reason: 'Excel 文件中没有有效数据行' },
    ])
  }

  const scopeErrors = rows
    .map((row) => validateImportScope(currentUser, row))
    .filter((error): error is NonNullable<typeof error> => Boolean(error))

  if (scopeErrors.length > 0) {
    return err(400, '导入失败', undefined, scopeErrors)
  }

  const now = new Date()
  const workItems: Prisma.WorkItemCreateManyInput[] = rows.map((row) => {
    const data = row.data
    if (data.type === 'PRIORITY' || data.type === 'MAIN') {
      return {
        type: data.type === 'PRIORITY' ? WorkItemType.PRIORITY : WorkItemType.MAIN,
        title: data.workItem,
        status: WorkItemStatus.DRAFT,
        creatorId: currentUser.id,
        departmentId: data.departmentId,
        businessCategory: data.businessCategory || null,
        workItem: data.workItem,
        isInnovation: data.isInnovation || false,
        workNode: data.workNode || null,
        completeTime: null,
        planCompleteTime: data.planCompleteTime
          ? new Date(data.planCompleteTime)
          : null,
        completeForm: data.completeForm || null,
        responsibleLeader: data.responsibleLeader || null,
        responsiblePerson: data.responsiblePerson || null,
        cooperators: data.cooperators.length
          ? toInputJsonValue(data.cooperators)
          : undefined,
        createdAt: now,
        updatedAt: now,
      }
    } else {
      const finalProposedLeaderId =
        data.proposedLeaderId || data.approvalLeaderId
      const finalApprovalLeaderId =
        data.approvalLeaderId || finalProposedLeaderId

      return {
        type: WorkItemType.TODO,
        title: data.workItem,
        status: WorkItemStatus.DRAFT,
        creatorId: currentUser.id,
        departmentId: data.departmentId || currentUser.departmentId,
        proposedLeaderId: finalProposedLeaderId,
        approvalLeaderId: finalApprovalLeaderId,
        proposedScene: data.proposedScene || null,
        workItem: data.workItem,
        formedTime: data.formedTime
          ? new Date(data.formedTime)
          : null,
        responsibleLeader: data.responsibleLeader || null,
        responsiblePerson: data.responsiblePerson || null,
        cooperators: data.cooperators.length
          ? toInputJsonValue(data.cooperators)
          : undefined,
        workPlan: data.workPlan,
        planCompleteTime: data.planCompleteTime
          ? new Date(data.planCompleteTime)
          : null,
        progress: data.progress || null,
        createdAt: now,
        updatedAt: now,
      }
    }
  })

  const result = await createImportedWorkItems({
    workItems,
    logUserId: currentUser.id,
    logUserName: currentUser.name,
    logUserRole: currentUser.role,
    typeLabel: type.toUpperCase(),
  })

  return ok(result.count)
}
