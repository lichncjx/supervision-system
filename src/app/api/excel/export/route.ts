import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fromError } from '@/shared/http/api-response'
import { exportWorksToExcelUseCase } from '@/features/excel/application/export-works-to-excel.usecase'

export const GET = withApiHandler(async (request: NextRequest) => {
  const currentUser = await requireCurrentUser(request)

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')?.trim() || null
  const departmentId = searchParams.get('departmentId')
  const keyword = searchParams.get('keyword')?.trim() || null
  const assessmentYear = searchParams.get('assessmentYear')
  const workItem = searchParams.get('workItem')?.trim() || null
  const month = searchParams.get('month')?.trim() || null

  const result = await exportWorksToExcelUseCase({
    currentUser,
    type,
    status,
    departmentId,
    keyword,
    assessmentYear,
    workItem,
    month,
  })

  if (!result.ok) return fromError(result)

  return new NextResponse(result.data.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.data.fileName)}"`,
    },
  })
})
