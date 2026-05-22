import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { getDashboardDataUseCase } from '@/features/dashboard/application/get-dashboard-data.usecase'
import type { DashboardData } from '@/features/dashboard/domain/dashboard.types'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') || undefined)

    const response: DashboardData = await getDashboardDataUseCase({
      currentUser: auth.user,
      options: { limit },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: '获取首页数据失败' },
      { status: 500 },
    )
  }
}
