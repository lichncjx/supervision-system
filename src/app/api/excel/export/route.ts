import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { exportWorksToExcelUseCase } from '@/features/excel/application/export-works-to-excel.usecase'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')?.trim() || null
    const departmentId = searchParams.get('departmentId')
    const keyword = searchParams.get('keyword')?.trim() || null

    const result = await exportWorksToExcelUseCase({
      currentUser,
      type,
      status,
      departmentId,
      keyword,
    })

    if (result.kind === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      )
    }

    return new NextResponse(result.buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.fileName)}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    console.error('Export error:', message)
    return NextResponse.json(
      { error: `导出失败: ${message}` },
      { status: 500 },
    )
  }
}
