import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/shared/db/prisma'
import { verifyToken } from '@/shared/auth/jwt'
import { Role } from '@prisma/client'

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

    const { searchParams } = new URL(request.url)
    const departmentIdRaw = searchParams.get('departmentId')
    const isLeaderRaw = searchParams.get('isLeader')

    if (!departmentIdRaw) {
      return NextResponse.json({ error: '缺少 departmentId 参数' }, { status: 400 })
    }

    const departmentId = parseInt(departmentIdRaw)
    if (isNaN(departmentId)) {
      return NextResponse.json({ error: 'departmentId 必须为整数' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      departmentId,
      isActive: true,
    }

    if (isLeaderRaw !== null) {
      if (isLeaderRaw !== 'true' && isLeaderRaw !== 'false') {
        return NextResponse.json(
          { error: 'isLeader 只能为 true 或 false' },
          { status: 400 },
        )
      }
      where.isLeader = isLeaderRaw === 'true'
    }

    const members = await prisma.member.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, name: true, isActive: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })

    const result = members.map((m) => ({
      id: m.id,
      name: m.name,
      departmentId: m.departmentId,
      departmentName: m.department.name,
      phone: m.phone,
      isLeader: m.isLeader,
      sortOrder: m.sortOrder,
      isActive: m.isActive,
      userId: m.userId,
      user: m.user
        ? { id: m.user.id, username: m.user.username, name: m.user.name, isActive: m.user.isActive }
        : null,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: '获取人员列表失败' }, { status: 500 })
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
    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const body = await request.json()
    const { name, departmentId, phone, isLeader, sortOrder, userId, importFromUserId } = body

    // Resolve data from import source or direct fields
    let resolvedName = name
    let resolvedDepartmentId = departmentId
    let resolvedPhone = phone ?? null
    let resolvedUserId = userId ?? null

    if (importFromUserId) {
      const importUser = await prisma.user.findUnique({
        where: { id: importFromUserId },
        include: { department: true },
      })
      if (!importUser) {
        return NextResponse.json({ error: '导入用户不存在' }, { status: 400 })
      }
      resolvedName = name ?? importUser.name
      resolvedDepartmentId = departmentId ?? importUser.departmentId
      resolvedPhone = phone ?? importUser.phone ?? null
      resolvedUserId = importFromUserId
    }

    if (!resolvedName || !resolvedDepartmentId) {
      return NextResponse.json({ error: '姓名和部门为必填字段' }, { status: 400 })
    }

    const department = await prisma.department.findUnique({
      where: { id: resolvedDepartmentId },
    })
    if (!department) {
      return NextResponse.json({ error: '部门不存在' }, { status: 400 })
    }

    // If userId is provided, validate uniqueness and existence
    const warnings: string[] = []
    if (resolvedUserId) {
      const user = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        include: { department: true },
      })
      if (!user) {
        return NextResponse.json({ error: '绑定的系统用户不存在' }, { status: 400 })
      }

      const existingMember = await prisma.member.findUnique({
        where: { userId: resolvedUserId },
      })
      if (existingMember) {
        return NextResponse.json(
          { error: `该系统用户已绑定到人员 "${existingMember.name}"（ID: ${existingMember.id}）` },
          { status: 409 },
        )
      }

      if (user.name !== resolvedName) {
        warnings.push(`人员姓名 "${resolvedName}" 与系统用户姓名 "${user.name}" 不一致`)
      }
      if (user.departmentId !== resolvedDepartmentId) {
        warnings.push(
          `人员部门与系统用户部门不一致（人员: ${department.name}，用户: ${user.department.name ?? '未知'}）`,
        )
      }
      if (!user.isActive) {
        warnings.push('该系统用户已被停用')
      }
    }

    const member = await prisma.member.create({
      data: {
        name: resolvedName,
        departmentId: resolvedDepartmentId,
        phone: resolvedPhone,
        isLeader: isLeader ?? false,
        sortOrder: sortOrder ?? 0,
        isActive: true,
        userId: resolvedUserId,
      },
      include: {
        user: { select: { id: true, username: true, name: true, isActive: true } },
        department: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(
      {
        id: member.id,
        name: member.name,
        departmentId: member.departmentId,
        departmentName: member.department.name,
        phone: member.phone,
        isLeader: member.isLeader,
        sortOrder: member.sortOrder,
        isActive: member.isActive,
        userId: member.userId,
        user: member.user
          ? { id: member.user.id, username: member.user.username, name: member.user.name, isActive: member.user.isActive }
          : null,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Create member error:', error)
    return NextResponse.json({ error: '创建人员失败' }, { status: 500 })
  }
}
