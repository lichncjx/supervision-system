import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { getDashboardDataUseCase } from '@/features/dashboard/application/get-dashboard-data.usecase'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') || undefined)

    return NextResponse.json(
      await getDashboardDataUseCase({
        currentUser: auth.user,
        options: { limit },
      }),
    )
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: '获取首页数据失败' },
      { status: 500 },
    )
  }
}
