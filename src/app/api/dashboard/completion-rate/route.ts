import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { getCompletionRateUseCase } from '@/features/dashboard/application/get-completion-rate.usecase'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const result = await getCompletionRateUseCase({
      currentUser: auth.user,
      type,
      startDate,
      endDate,
    })

    if (result.kind === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json({
      items: result.items,
      total: result.total,
    })
  } catch (error) {
    console.error('Completion rate error:', error)
    return NextResponse.json(
      { error: '获取完成率统计失败' },
      { status: 500 },
    )
  }
}
