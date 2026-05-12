import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { getWorkDetailUseCase } from '@/features/works/application/get-work-detail.usecase'
import { updateWorkUseCase } from '@/features/works/application/update-work.usecase'
import { deleteWorkUseCase } from '@/features/works/application/delete-work.usecase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const { id } = await params
    const workId = parseInt(id)
    if (isNaN(workId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 })
    }

    const result = await getWorkDetailUseCase({ currentUser, workId })

    if (result.kind === 'not-found') {
      return NextResponse.json({ error: '事项不存在' }, { status: 404 })
    }

    if (result.kind === 'forbidden') {
      return NextResponse.json({ error: '无权限访问此事项' }, { status: 403 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Get work error:', error)
    return NextResponse.json({ error: '获取事项详情失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const { id } = await params
    const workId = parseInt(id)
    if (isNaN(workId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 })
    }

    const body = await request.json()

    const result = await updateWorkUseCase({ currentUser, workId, body })

    if (result.kind === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Update work error:', error)
    return NextResponse.json({ error: '修改事项失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    const currentUser = auth.user

    const { id } = await params
    const workId = parseInt(id)
    if (isNaN(workId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 })
    }

    const result = await deleteWorkUseCase({ currentUser, workId })

    if (result.kind === 'error') {
      return NextResponse.json(
        { error: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error('Delete work error:', error)
    return NextResponse.json({ error: '删除事项失败' }, { status: 500 })
  }
}
