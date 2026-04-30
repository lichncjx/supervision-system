import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/server-auth';

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

    const departments = await prisma.department.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    return NextResponse.json({ error: '获取部门列表失败' }, { status: 500 });
  }
}
