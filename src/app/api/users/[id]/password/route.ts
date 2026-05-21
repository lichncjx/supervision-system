import { NextResponse, NextRequest } from 'next/server'
import { authenticateAdmin } from '@/features/users/application/admin-auth'
import { resetUserPasswordUseCase } from '@/features/users/application/reset-user-password.usecase'
import type { ResetUserPasswordRequest } from '@/features/users/contract/user-api.types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request.cookies.get('token')?.value)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const { id } = await params
    const userId = parseInt(id)
    const body = (await request.json()) as ResetUserPasswordRequest

    const result = await resetUserPasswordUseCase(auth.user, userId, body)
    if (result.kind === 'error')
      return NextResponse.json({ error: result.message }, { status: result.status })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: '重置密码失败' }, { status: 500 })
  }
}
