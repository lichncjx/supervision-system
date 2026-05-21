import { NextResponse, NextRequest } from 'next/server'
import { verifyToken } from '@/shared/auth/jwt'
import { listCompanyLeadersUseCase } from '@/features/users/application/list-company-leaders.usecase'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const result = await listCompanyLeadersUseCase()
    if (result.kind === 'error')
      return NextResponse.json({ error: result.message }, { status: result.status })

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Get company leaders error:', error)
    return NextResponse.json({ error: '获取公司领导失败' }, { status: 500 })
  }
}
