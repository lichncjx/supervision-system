import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { getDashboardSummaryUseCase } from '@/features/dashboard/application/get-dashboard-summary.usecase'
import type { DashboardSummary } from '@/features/dashboard/domain/dashboard.types'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const response: DashboardSummary = await getDashboardSummaryUseCase({
      currentUser: auth.user,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json(
      { error: '获取统计失败' },
      { status: 500 },
    )
  }
}
