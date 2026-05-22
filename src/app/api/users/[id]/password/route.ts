import { NextRequest } from 'next/server'
import { authenticateAdmin } from '@/features/users/application/admin-auth'
import { actionOk, fail, failResult } from '@/shared/http/api-response'
import { resetUserPasswordUseCase } from '@/features/users/application/reset-user-password.usecase'
import type { ResetUserPasswordRequest } from '@/features/users/contract/user-api.types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request.cookies.get('token')?.value)
    if (!auth.ok) return failResult(auth)

    const { id } = await params
    const userId = parseInt(id)
    if (isNaN(userId)) {
      return fail('无效的用户ID', 400)
    }

    const body = (await request.json()) as ResetUserPasswordRequest

    const result = await resetUserPasswordUseCase(auth.user, userId, body)
    if (result.kind === 'error')
      return failResult(result)

    return actionOk()
  } catch (error) {
    console.error('Reset password error:', error)
    return fail('重置密码失败', 500)
  }
}
