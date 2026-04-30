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
      const response = NextResponse.json({ error: '登录已过期' }, { status: 401 });
      response.cookies.set({
        name: 'token',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { department: true },
    });

    if (!user || !user.isActive) {
      const response = NextResponse.json({ error: '用户不存在或已停用' }, { status: 401 });
      response.cookies.set({
        name: 'token',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name || '',
      isActive: user.isActive,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}
