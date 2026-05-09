import { NextRequest, NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/dashboard-data'
import { getUserFromToken } from '@/lib/server-auth'

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
    const limit = Number(searchParams.get('limit') || undefined)

    return NextResponse.json(await getDashboardData(currentUser, { limit }))
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: '获取首页数据失败' }, { status: 500 })
  }
}
