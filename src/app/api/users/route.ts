import { NextResponse, NextRequest } from 'next/server'
import { authenticateAdmin } from '@/features/users/application/admin-auth'
import { listUsersUseCase } from '@/features/users/application/list-users.usecase'
import { createUserUseCase } from '@/features/users/application/create-user.usecase'
import type { CreateUserRequest } from '@/features/users/contract/user-api.types'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request.cookies.get('token')?.value)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const result = await listUsersUseCase(auth.user)
    if (result.kind === 'error')
      return NextResponse.json({ error: result.message }, { status: result.status })

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request.cookies.get('token')?.value)
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

    const body = (await request.json()) as CreateUserRequest
    const result = await createUserUseCase(auth.user, body)
    if (result.kind === 'error')
      return NextResponse.json({ error: result.message }, { status: result.status })

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 })
  }
}
