import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { parseWorkType, parseWorkStatusFilter, queryWorksUseCase } from '@/features/works/application/query-works.usecase'
import { createWorkUseCase } from '@/features/works/application/create-work.usecase'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const { searchParams } = new URL(request.url)
    const params = {
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      departmentId: searchParams.get('departmentId'),
      keyword: searchParams.get('keyword'),
    }

    if (params.type) {
      const workType = parseWorkType(params.type)
      if (!workType) {
        return NextResponse.json({ error: '无效的事项类型' }, { status: 400 })
      }
    }

    const statusFilter = parseWorkStatusFilter(params.status)
    if (statusFilter?.kind === 'invalid') {
      return NextResponse.json({ error: '无效的状态筛选' }, { status: 400 })
    }

    const result = await queryWorksUseCase({ currentUser, params })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get works error:', error)
    return NextResponse.json({ error: '获取事项列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const body = await request.json()

    const result = await createWorkUseCase({ currentUser, body })

    if (result.kind === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Create work error:', error)
    return NextResponse.json({ error: '创建事项失败' }, { status: 500 })
  }
}
