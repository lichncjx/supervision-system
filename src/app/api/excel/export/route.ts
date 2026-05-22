import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { fail, fromError } from '@/shared/http/api-response'
import { exportWorksToExcelUseCase } from '@/features/excel/application/export-works-to-excel.usecase'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireCurrentUser(request)

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

    if (result.kind === 'error') return fromError(result)

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
    return fail(`导出失败: ${message}`, 500)
  }
}
