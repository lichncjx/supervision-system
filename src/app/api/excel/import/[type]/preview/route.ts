import { createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { signExcelImportPreviewToken } from '@/shared/auth/jwt'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fail, ok } from '@/shared/http/api-response'
import { inspectExcelImport } from '@/features/excel/application/inspect-excel-import.usecase'

const VALID_TYPES = ['priority', 'main', 'todo'] as const

function normalizeType(type: string) {
  const normalized = type.toLowerCase()
  return VALID_TYPES.includes(normalized as (typeof VALID_TYPES)[number])
    ? (normalized as (typeof VALID_TYPES)[number])
    : null
}

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ type: string }> }) => {
    const currentUser = await requireCurrentUser(request)
    const { type } = await params
    const normalizedType = normalizeType(type)
    if (!normalizedType) return fail('无效的导入类型', 400)

    const formData = await request.formData()
    const file = formData.get('file')
    const assessmentYear = formData.get('assessmentYear')
    if (!(file instanceof File)) return fail('请选择要导入的文件', 400)
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return fail('只支持 .xlsx 或 .xls 格式', 400)
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const inspection = await inspectExcelImport({
      currentUser,
      type: normalizedType,
      fileBuffer,
      assessmentYear,
    })
    const rows = inspection.rows.map((row) => ({
      row: row.row,
      workItem: row.data.workItem,
      workNode: row.data.workNode || null,
      departmentName: row.data.departmentName || null,
      responsiblePerson: row.data.responsiblePerson || null,
    }))

    if (inspection.errors.length > 0 || !inspection.assessmentYear) {
      return ok({ rows, errors: inspection.errors, warnings: inspection.warnings })
    }

    const fileHash = createHash('sha256').update(fileBuffer).digest('hex')
    const previewToken = signExcelImportPreviewToken({
      userId: currentUser.id,
      type: normalizedType,
      assessmentYear: inspection.assessmentYear,
      fileHash,
    })

    return ok({
      previewToken,
      rows,
      errors: [],
      warnings: inspection.warnings,
    })
  },
)
