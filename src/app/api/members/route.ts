import { NextResponse, NextRequest } from 'next/server'
import { verifyToken } from '@/shared/auth/jwt'
import { prisma } from '@/shared/db/prisma'
import { Role } from '@prisma/client'
import { queryMembersUseCase } from '@/features/members/application/query-members.usecase'
import { createMemberUseCase } from '@/features/members/application/create-member.usecase'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: '登录已过期' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const departmentIdRaw = searchParams.get('departmentId')
    const isLeaderRaw = searchParams.get('isLeader')
    const includeInactive = searchParams.get('includeInactive')

    if (!departmentIdRaw) {
      return NextResponse.json({ error: '缺少 departmentId 参数' }, { status: 400 })
    }

    const departmentId = parseInt(departmentIdRaw)
    if (isNaN(departmentId)) {
      return NextResponse.json({ error: 'departmentId 必须为整数' }, { status: 400 })
    }

    if (isLeaderRaw !== null && isLeaderRaw !== 'true' && isLeaderRaw !== 'false') {
      return NextResponse.json({ error: 'isLeader 只能为 true 或 false' }, { status: 400 })
    }

    const result = await queryMembersUseCase({
      departmentId,
      isLeader: isLeaderRaw === 'true' ? true : isLeaderRaw === 'false' ? false : undefined,
      includeInactive: includeInactive === 'true',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: '获取人员列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: '登录已过期' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const body = await request.json()
    const result = await createMemberUseCase({
      name: body.name,
      departmentId: body.departmentId,
      phone: body.phone,
      isLeader: body.isLeader ?? false,
      sortOrder: body.sortOrder ?? 0,
      userId: body.userId,
      importFromUserId: body.importFromUserId,
    })

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.message }, { status: result.status })
    }

    return NextResponse.json(
      { ...result.data, warnings: result.warnings },
      { status: 201 },
    )
  } catch (error) {
    console.error('Create member error:', error)
    return NextResponse.json({ error: '创建人员失败' }, { status: 500 })
  }
}
