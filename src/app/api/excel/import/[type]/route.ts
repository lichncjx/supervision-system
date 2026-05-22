import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fail, fromError } from '@/shared/http/api-response'
import { importWorksFromExcelUseCase } from '@/features/excel/application/import-works-from-excel.usecase'
import type {
  ImportExcelSuccessResponse,
  ImportExcelValidationErrorResponse,
} from '@/features/excel/contract/excel-api.types'

export const POST = withApiHandler(
  async (request: NextRequest, { params }: { params: Promise<{ type: string }> }) => {
    const currentUser = await requireCurrentUser(request)

    const { type } = await params
    const validTypes = [
      'priority',
      'main',
      'todo',
      'PRIORITY',
      'MAIN',
      'TODO',
    ]
    if (!validTypes.includes(type)) {
      return fail('无效的导入类型', 400)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return fail('请选择要导入的文件', 400)
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return fail('只支持 .xlsx 或 .xls 格式', 400)
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const result = await importWorksFromExcelUseCase({
      currentUser,
      type,
      fileBuffer,
      fileName: file.name,
    })

    if (result.kind === 'error') return fromError(result)

    if (result.kind === 'validation-error') {
      const status =
        result.details.some(
          (d) =>
            d.reason.includes('部门用户只能导入') ||
            d.reason.includes('公司领导普通导入') ||
            d.reason.includes('公司领导不能默认') ||
            d.reason.includes('当前角色无'),
        )
          ? 403
          : 400
      const response: ImportExcelValidationErrorResponse = {
        success: false,
        error: result.error,
        details: result.details,
      }

      return NextResponse.json(response, { status })
    }

    const response: ImportExcelSuccessResponse = {
      success: true,
      imported: result.imported,
      message: result.message,
    }

    return NextResponse.json(response)
  },
)
