import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { importWorksFromExcelUseCase } from '@/features/excel/application/import-works-from-excel.usecase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

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
      return NextResponse.json(
        { error: '无效的导入类型' },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json(
        { error: '请选择要导入的文件' },
        { status: 400 },
      )
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: '只支持 .xlsx 或 .xls 格式' },
        { status: 400 },
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const result = await importWorksFromExcelUseCase({
      currentUser,
      type,
      fileBuffer,
      fileName: file.name,
    })

    if (result.kind === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      )
    }

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
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details,
        },
        { status },
      )
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      message: result.message,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: '导入失败：' + (error as Error).message },
      { status: 500 },
    )
  }
}
