import { validateAndParseExcel } from '@/features/excel/infrastructure/work-import-parser'
import {
  findDepartmentsForImport,
  findCompanyLeadersForImport,
  createImportedWorkItems,
} from '@/features/excel/infrastructure/work-import.repository'
import { validateImportScope } from '@/features/excel/domain/excel-import.rules'
import type { ImportWorksFromExcelInput, ImportWorksFromExcelResult } from '@/features/excel/presentation/excel.dto'

export async function importWorksFromExcelUseCase(
  input: ImportWorksFromExcelInput,
): Promise<ImportWorksFromExcelResult> {
  const { currentUser, type, fileBuffer } = input

  const departments = await findDepartmentsForImport()
  const companyLeaders = await findCompanyLeadersForImport()

  const { rows, errors } = await validateAndParseExcel(
    fileBuffer,
    type,
    departments,
    companyLeaders,
  )

  if (errors.length > 0) {
    return {
      kind: 'validation-error',
      error: '导入失败，请修正以下错误',
      details: errors,
    }
  }

  if (rows.length === 0) {
    return {
      kind: 'validation-error',
      error: '导入失败',
      details: [
        {
          row: 0,
          field: 'file',
          value: '',
          reason: 'Excel 文件中没有有效数据行',
        },
      ],
    }
  }

  const scopeErrors = rows
    .map((row) => validateImportScope(currentUser, row))
    .filter((error): error is NonNullable<typeof error> => Boolean(error))

  if (scopeErrors.length > 0) {
    return {
      kind: 'validation-error',
      error: '导入失败',
      details: scopeErrors,
    }
  }

  const now = new Date()
  const workItems = rows.map((row): any => {
    const data = row.data
    if (data.type === 'PRIORITY' || data.type === 'MAIN') {
      return {
        type: data.type as any,
        title: data.workItem,
        status: 'DRAFT' as any,
        creatorId: currentUser.id,
        departmentId: data.departmentId,
        businessCategory: data.businessCategory || null,
        workItem: data.workItem,
        isInnovation: data.isInnovation || false,
        workNode: data.workNode || null,
        completeTime: data.completeTime
          ? new Date(data.completeTime)
          : null,
        completeForm: data.completeForm || null,
        responsibleLeader: data.responsibleLeader || null,
        responsiblePerson: data.responsiblePerson || null,
        cooperators: data.cooperators?.length
          ? data.cooperators
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
        type: 'TODO' as any,
        title: data.workItem,
        status: 'DRAFT' as any,
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
        cooperators: data.cooperators?.length
          ? data.cooperators
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

  return {
    kind: 'success',
    imported: result.count,
    message: `成功导入 ${result.count} 条事项，导入后状态为草稿，请确认后手动提交审批`,
  }
}
