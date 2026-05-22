import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/shared/auth/get-current-user'
import {
  listOperationLogsUseCase,
  parseOperationLogQuery,
} from '@/features/operation-logs/application/list-operation-logs.usecase'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const currentUser = await getUserFromToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const result = await listOperationLogsUseCase(
      currentUser,
      parseOperationLogQuery(searchParams),
    )

    if (result.kind === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Get operation logs error:', error)
    return NextResponse.json({ error: '获取操作日志失败' }, { status: 500 })
  }
}
