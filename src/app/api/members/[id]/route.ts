import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/shared/db/prisma'
import { verifyToken } from '@/shared/auth/jwt'
import { Role } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params
    const memberId = parseInt(id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: '无效的人员ID' }, { status: 400 })
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { department: true, user: true },
    })
    if (!member) {
      return NextResponse.json({ error: '人员不存在' }, { status: 404 })
    }

    const body = await request.json()
    const { name, departmentId, phone, isLeader, sortOrder, isActive, userId } = body

    // Resolve userId action: bind / unbind / rebind
    // undefined = leave unchanged
    // null = unbind (remove userId)
    // number = bind or rebind
    const warnings: string[] = []
    let resolvedUserId: number | null | undefined

    if (userId === null) {
      resolvedUserId = null
    } else if (typeof userId === 'number') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true },
      })
      if (!user) {
        return NextResponse.json({ error: '绑定的系统用户不存在' }, { status: 400 })
      }

      const existingMember = await prisma.member.findUnique({
        where: { userId },
      })
      if (existingMember && existingMember.id !== memberId) {
        return NextResponse.json(
          { error: `该系统用户已绑定到人员 "${existingMember.name}"（ID: ${existingMember.id}）` },
          { status: 409 },
        )
      }

      const effectiveName = name ?? member.name
      const effectiveDeptId = departmentId ?? member.departmentId

      if (user.name !== effectiveName) {
        warnings.push(`人员姓名 "${effectiveName}" 与系统用户姓名 "${user.name}" 不一致`)
      }
      if (user.departmentId !== effectiveDeptId) {
        const dept = await prisma.department.findUnique({ where: { id: effectiveDeptId } })
        warnings.push(
          `人员部门与系统用户部门不一致（人员: ${dept?.name ?? '未知'}，用户: ${user.department?.name ?? '未知'}）`,
        )
      }
      if (!user.isActive) {
        warnings.push('该系统用户已被停用')
      }

      resolvedUserId = userId
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (departmentId !== undefined) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } })
      if (!dept) {
        return NextResponse.json({ error: '部门不存在' }, { status: 400 })
      }
      updateData.departmentId = departmentId
    }
    if (phone !== undefined) updateData.phone = phone
    if (isLeader !== undefined) updateData.isLeader = isLeader
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive !== undefined) updateData.isActive = isActive
    if (resolvedUserId !== undefined) updateData.userId = resolvedUserId

    const updatedMember = await prisma.member.update({
      where: { id: memberId },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, name: true, isActive: true } },
        department: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      id: updatedMember.id,
      name: updatedMember.name,
      departmentId: updatedMember.departmentId,
      departmentName: updatedMember.department.name,
      phone: updatedMember.phone,
      isLeader: updatedMember.isLeader,
      sortOrder: updatedMember.sortOrder,
      isActive: updatedMember.isActive,
      userId: updatedMember.userId,
      user: updatedMember.user
        ? { id: updatedMember.user.id, username: updatedMember.user.username, name: updatedMember.user.name, isActive: updatedMember.user.isActive }
        : null,
      createdAt: updatedMember.createdAt,
      updatedAt: updatedMember.updatedAt,
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: '更新人员失败' }, { status: 500 })
  }
}
