import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/shared/auth/get-current-user'
import { queryOperationLogsUseCase } from '@/features/operation-logs/application/query-operation-logs.usecase'

const PARAM_KEYS = [
  'page',
  'pageSize',
  'action',
  'module',
  'userId',
  'targetType',
  'targetId',
  'startDate',
  'endDate',
  'keyword',
] as const

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
    const rawParams: Record<string, string | null> = {}
    for (const key of PARAM_KEYS) {
      rawParams[key] = searchParams.get(key)
    }

    const result = await queryOperationLogsUseCase(currentUser, rawParams)
    if (result.kind === 'error') {
      return NextResponse.json({ error: result.message }, { status: result.status })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Get operation logs error:', error)
    return NextResponse.json({ error: '获取操作日志失败' }, { status: 500 })
  }
}
