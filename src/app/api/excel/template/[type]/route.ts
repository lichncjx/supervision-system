import { NextRequest, NextResponse } from 'next/server'
import { requireCurrentUser } from '@/shared/auth/require-current-user'
import { withApiHandler } from '@/shared/http/with-api-handler'
import { fail } from '@/shared/http/api-response'
import type { ExcelRouteType } from '@/features/excel/domain/excel.types'
import { getExcelTemplate } from '@/features/excel/infrastructure/excel-template-generator'

type RouteContext = { params: Promise<{ type: string }> }

export const GET = withApiHandler(async (request: NextRequest, { params }: RouteContext) => {
  await requireCurrentUser(request)

  const { type } = await params
  const validTypes = ['priority', 'main', 'todo', 'PRIORITY', 'MAIN', 'TODO']

  if (!validTypes.includes(type)) {
    return fail('无效的模板类型', 400)
  }

  const normalizedType = type.toLowerCase() as ExcelRouteType
  const { body, fileName } = getExcelTemplate(normalizedType)

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Length': String(body.byteLength),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  })
})
