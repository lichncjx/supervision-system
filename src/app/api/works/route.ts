import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/server-auth'
import { parseWorkQuery, parseWorkType, parseWorkStatusFilter } from '@/features/works/presentation/work.validators'
import { queryWorksUseCase } from '@/features/works/application/query-works.usecase'
import { createWorkUseCase } from '@/features/works/application/create-work.usecase'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = parseWorkQuery(searchParams)

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
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }

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
