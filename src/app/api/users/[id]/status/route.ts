import { NextResponse, NextRequest } from 'next/server'
import { authenticateAdmin } from '@/features/users/application/admin-auth'
import { toggleUserStatusUseCase } from '@/features/users/application/toggle-user-status.usecase'
import type { ToggleUserStatusRequest } from '@/features/users/contract/user-api.types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request.cookies.get('token')?.value)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const { id } = await params
    const userId = parseInt(id)
    const body = (await request.json()) as ToggleUserStatusRequest

    const result = await toggleUserStatusUseCase(auth.user, userId, body)
    if (result.kind === 'error')
      return NextResponse.json({ error: result.message }, { status: result.status })

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Update user status error:', error)
    return NextResponse.json({ error: '更新用户状态失败' }, { status: 500 })
  }
}
