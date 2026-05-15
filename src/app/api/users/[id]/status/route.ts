import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/shared/db/prisma';
import { verifyToken } from '@/shared/auth/jwt';
import { Role } from '@prisma/client';

const PROTECTED_USERNAMES = ['admin', 'supervisor', 'president', 'vice_president', 'dept_leader', 'dept_manager'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    if (userId === decoded.userId) {
      return NextResponse.json({ error: '不允许停用当前登录的管理员账号' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (PROTECTED_USERNAMES.includes(user.username)) {
      return NextResponse.json({ error: '内置账号不允许停用' }, { status: 403 });
    }

    const { isActive } = await request.json();

    if (isActive === undefined) {
      return NextResponse.json({ error: '请指定启用状态' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return NextResponse.json({
      id: updatedUser.id,
      username: updatedUser.username,
      isActive: updatedUser.isActive,
    });
  } catch (error) {
    console.error('Update user status error:', error);
    return NextResponse.json({ error: '更新用户状态失败' }, { status: 500 });
  }
}
