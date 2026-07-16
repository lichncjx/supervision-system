import type { BaseCurrentUser } from '@/shared/auth/current-user'
import {
  validateImportScope,
  type ImportRow,
  type ValidationError,
} from '@/features/excel/domain/excel-import.rules'
import { validateAndParseExcel } from '@/features/excel/infrastructure/work-import-parser'
import {
  findAllActiveUsers,
  findCompanyLeaders,
} from '@/features/excel/infrastructure/work-import.repository'
import { findDepartmentsForImport } from '@/features/departments/infrastructure/department.repository'
import {
  normalizeAssessmentYear,
  validateStructuredWorkFields,
} from '@/features/works/domain/work-structure.rules'

export const MAX_EXCEL_IMPORT_ROWS = 200

export interface InspectExcelImportInput {
  currentUser: BaseCurrentUser
  type: string
  fileBuffer: Buffer
  assessmentYear: unknown
}

export interface ImportWarning {
  row: number
  field: string
  value: string
  reason: string
}

export interface ExcelImportInspection {
  assessmentYear: number | null
  rows: ImportRow[]
  errors: ValidationError[]
  warnings: ImportWarning[]
}

export async function inspectExcelImport(
  input: InspectExcelImportInput,
): Promise<ExcelImportInspection> {
  const assessmentYear = normalizeAssessmentYear(input.assessmentYear)
  if (!assessmentYear) {
    return {
      assessmentYear: null,
      rows: [],
      warnings: [],
      errors: [
        {
          row: 0,
          field: '年度',
          value: String(input.assessmentYear ?? ''),
          reason: '请选择有效年度',
        },
      ],
    }
  }

  const [departments, companyLeaders, allUsers] = await Promise.all([
    findDepartmentsForImport(),
    findCompanyLeaders(),
    findAllActiveUsers(),
  ])

  const parsed = await validateAndParseExcel(
    input.fileBuffer,
    input.type,
    departments,
    companyLeaders,
    allUsers,
  )
  const errors = [...parsed.errors]

  if (parsed.rows.length > MAX_EXCEL_IMPORT_ROWS) {
    errors.push({
      row: 0,
      field: 'file',
      value: String(parsed.rows.length),
      reason: `单次 Excel 导入最多 ${MAX_EXCEL_IMPORT_ROWS} 行，请拆分后导入`,
    })
  }

  const rows = parsed.rows.map((row) => {
    if (row.data.type !== 'PRIORITY' && row.data.type !== 'MAIN') return row

    const structured = validateStructuredWorkFields({
      workItem: row.data.workItem,
      workNode: row.data.workNode,
    })
    if (!structured.ok) {
      errors.push({
        row: row.row,
        field: '工作事项/工作节点',
        value: `${row.data.workItem}｜${row.data.workNode || ''}`,
        reason: structured.message,
      })
      return row
    }

    return {
      ...row,
      data: {
        ...row.data,
        workItem: structured.workItem,
        workNode: structured.workNode,
      },
    }
  })

  errors.push(
    ...rows
      .map((row) => validateImportScope(input.currentUser, row))
      .filter((error): error is ValidationError => Boolean(error)),
  )

  const warnings: ImportWarning[] = []
  const firstNodeRows = new Map<string, number>()
  for (const row of rows) {
    if (row.data.type !== 'PRIORITY' && row.data.type !== 'MAIN') continue
    const key = `${row.data.type}\u0000${row.data.workItem}\u0000${row.data.workNode || ''}`
    const firstRow = firstNodeRows.get(key)
    if (firstRow) {
      warnings.push({
        row: row.row,
        field: '工作节点',
        value: row.data.workNode || '',
        reason: `与第 ${firstRow} 行属于同一工作事项且工作节点相同，请确认不是重复导入`,
      })
    } else {
      firstNodeRows.set(key, row.row)
    }
  }

  return { assessmentYear, rows, errors, warnings }
}
