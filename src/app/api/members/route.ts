import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUserOrAuthError } from '@/shared/auth/get-current-user-or-auth-error'
import { Role } from '@prisma/client'
import { queryMembersUseCase } from '@/features/members/application/query-members.usecase'
import { createMemberUseCase } from '@/features/members/application/create-member.usecase'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

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

    const isAdmin = auth.user.role === Role.ADMIN
    const result = await queryMembersUseCase({
      departmentId,
      isLeader: isLeaderRaw === 'true' ? true : isLeaderRaw === 'false' ? false : undefined,
      includeInactive: isAdmin && includeInactive === 'true',
    })

    // Non-admin callers only receive fields needed for form dropdowns.
    const sanitized = isAdmin
      ? result
      : result.map(({ id, name, departmentId, departmentName, isLeader }: any) => ({
          id, name, departmentId, departmentName, isLeader,
        }))

    return NextResponse.json(sanitized)
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: '获取人员列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrAuthError(request)
    if (!auth.ok) return auth.response

    if (auth.user.role !== Role.ADMIN) {
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
