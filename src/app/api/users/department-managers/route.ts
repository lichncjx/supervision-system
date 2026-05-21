import { NextResponse, NextRequest } from 'next/server'
import { getUserFromToken } from '@/shared/auth/get-current-user'
import { listDepartmentManagersUseCase } from '@/features/users/application/list-department-users.usecase'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const currentUser = await getUserFromToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const departmentId = searchParams.get('departmentId')
    if (!departmentId) {
      return NextResponse.json({ error: '请提供部门ID' }, { status: 400 })
    }

    const targetDeptId = parseInt(departmentId)
    const result = await listDepartmentManagersUseCase(currentUser, targetDeptId)
    if (result.kind === 'error')
      return NextResponse.json({ error: result.message }, { status: result.status })

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Get department managers error:', error)
    return NextResponse.json({ error: '获取部门主管失败' }, { status: 500 })
  }
}
