import { NextResponse, NextRequest } from 'next/server'
import { verifyToken } from '@/shared/auth/jwt'
import { prisma } from '@/shared/db/prisma'
import { Role } from '@prisma/client'
import { updateMemberUseCase } from '@/features/members/application/update-member.usecase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const decoded = verifyToken(token)
    if (!decoded) return NextResponse.json({ error: '登录已过期' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const { id } = await params
    const memberId = parseInt(id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: '无效的人员ID' }, { status: 400 })
    }

    const body = await request.json()
    const result = await updateMemberUseCase({
      memberId,
      name: body.name,
      departmentId: body.departmentId,
      phone: body.phone,
      isLeader: body.isLeader,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
      userId: body.userId,
    })

    if (result.kind === 'error') {
      return NextResponse.json({ error: result.message }, { status: result.status })
    }

    return NextResponse.json(
      { ...result.data, warnings: result.warnings },
    )
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: '更新人员失败' }, { status: 500 })
  }
}
