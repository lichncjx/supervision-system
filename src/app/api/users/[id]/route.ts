import { NextResponse, NextRequest } from 'next/server'
import { authenticateAdmin } from '@/features/users/application/admin-auth'
import { success, fail, fromError } from '@/shared/http/api-response'
import { updateUserUseCase } from '@/features/users/application/update-user.usecase'
import { deleteUserUseCase } from '@/features/users/application/delete-user.usecase'
import type { UpdateUserRequest } from '@/features/users/contract/user-api.types'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request.cookies.get('token')?.value)
    if (!auth.ok) return fromError(auth)

    const { id } = await params
    const userId = parseInt(id)
    if (isNaN(userId)) {
      return fail('无效的用户ID', 400)
    }

    const body = (await request.json()) as UpdateUserRequest

    const result = await updateUserUseCase(auth.user, userId, body)
    if (result.kind === 'error')
      return fromError(result)

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateAdmin(request.cookies.get('token')?.value)
    if (!auth.ok) return fromError(auth)

    const { id } = await params
    const userId = parseInt(id)

    const result = await deleteUserUseCase(auth.user, userId)
    if (result.kind === 'error')
      return fromError(result)

    return success()
  } catch (error) {
    console.error('Delete user error:', error)
    return fail('删除用户失败', 500)
  }
}
