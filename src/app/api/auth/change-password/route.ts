import { NextResponse, NextRequest } from 'next/server'
import { verifyToken } from '@/shared/auth/jwt'
import { changePasswordUseCase } from '@/features/users/application/change-password.usecase'
import type { ChangePasswordRequest } from '@/features/users/contract/user-api.types'

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const body = (await request.json()) as ChangePasswordRequest
    const result = await changePasswordUseCase(decoded.userId, body)
    if (result.kind === 'error')
      return NextResponse.json({ error: result.message }, { status: result.status })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 })
  }
}
