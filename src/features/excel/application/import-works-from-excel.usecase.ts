import type { BaseCurrentUser } from '@/shared/auth/current-user'
import { Prisma, WorkItemStatus, WorkItemType } from '@prisma/client'
import { err, ok, type Result } from '@/shared/result'
import { createImportedWorkItems } from '@/features/excel/infrastructure/work-import.repository'
import { inspectExcelImport } from '@/features/excel/application/inspect-excel-import.usecase'
import { deriveWorkDisplayTitle } from '@/features/works/domain/work-structure.rules'

export interface ImportWorksFromExcelInput {
  currentUser: BaseCurrentUser
  type: string
  fileBuffer: Buffer
  fileName: string
  assessmentYear: number
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function importWorksFromExcelUseCase(
  input: ImportWorksFromExcelInput,
): Promise<Result<number>> {
  const { currentUser, type } = input
  const inspection = await inspectExcelImport(input)
  const { rows, errors, assessmentYear } = inspection

  if (errors.length > 0) {
    return err(400, '导入失败，请修正以下错误', undefined, errors)
  }

  if (rows.length === 0) {
    return err(400, '导入失败', undefined, [
      { row: 0, field: 'file', value: '', reason: 'Excel 文件中没有有效数据行' },
    ])
  }

  if (!assessmentYear) return err(400, '导入失败，请选择有效年度')

  const now = new Date()
  const workItems: Prisma.WorkItemCreateManyInput[] = rows.map((row) => {
    const data = row.data
    if (data.type === 'PRIORITY' || data.type === 'MAIN') {
      return {
        type: data.type === 'PRIORITY' ? WorkItemType.PRIORITY : WorkItemType.MAIN,
        title: deriveWorkDisplayTitle({
          type: data.type,
          workItem: data.workItem,
          workNode: data.workNode,
        }),
        status: WorkItemStatus.DRAFT,
        creatorId: currentUser.id,
        assessmentYear,
        departmentId: data.departmentId,
        businessCategory: data.businessCategory || null,
        workItem: data.workItem,
        isInnovation: data.isInnovation || false,
        workNode: data.workNode || null,
        completeTime: null,
        planCompleteTime: data.planCompleteTime ? new Date(data.planCompleteTime) : null,
        completeForm: data.completeForm || null,
        responsibleLeader: data.responsibleLeader || null,
        responsiblePerson: data.responsiblePerson || null,
        responsibleLeaderUserId: data.responsibleLeaderUserId ?? null,
        responsiblePersonUserId: data.responsiblePersonUserId ?? null,
        cooperators: data.cooperators.length ? toInputJsonValue(data.cooperators) : undefined,
        createdAt: now,
        updatedAt: now,
      }
    } else {
      const finalProposedLeaderId = data.proposedLeaderId || data.approvalLeaderId
      const finalApprovalLeaderId = data.approvalLeaderId || finalProposedLeaderId

      return {
        type: WorkItemType.TODO,
        title: deriveWorkDisplayTitle({ type: WorkItemType.TODO, workItem: data.workItem }),
        status: WorkItemStatus.DRAFT,
        creatorId: currentUser.id,
        assessmentYear,
        departmentId: data.departmentId || currentUser.departmentId,
        proposedLeaderId: finalProposedLeaderId,
        approvalLeaderId: finalApprovalLeaderId,
        proposedScene: data.proposedScene || null,
        workItem: data.workItem,
        formedTime: data.formedTime ? new Date(data.formedTime) : null,
        responsibleLeader: data.responsibleLeader || null,
        responsiblePerson: data.responsiblePerson || null,
        responsibleLeaderUserId: data.responsibleLeaderUserId ?? null,
        responsiblePersonUserId: data.responsiblePersonUserId ?? null,
        cooperators: data.cooperators.length ? toInputJsonValue(data.cooperators) : undefined,
        workPlan: data.workPlan,
        planCompleteTime: data.planCompleteTime ? new Date(data.planCompleteTime) : null,
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
