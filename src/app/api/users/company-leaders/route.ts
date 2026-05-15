import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/shared/db/prisma';
import { verifyToken } from '@/lib/server-auth';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const leaders = await prisma.user.findMany({
      where: {
        role: { in: [Role.PRESIDENT, Role.VICE_PRESIDENT] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        departmentId: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { id: 'asc' },
      ],
    });

    const result = leaders.map((leader) => ({
      id: leader.id,
      name: leader.name,
      role: leader.role,
      departmentId: leader.departmentId,
      departmentName: leader.department?.name || '',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get company leaders error:', error);
    return NextResponse.json({ error: '获取公司领导失败' }, { status: 500 });
  }
}
