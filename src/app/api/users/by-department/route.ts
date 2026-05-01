import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import { Role } from '@prisma/client';

function isCompanyLevelRole(role: string): boolean {
  const companyRoles: string[] = ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'];
  return companyRoles.includes(role);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);

    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');

    if (!departmentId) {
      return NextResponse.json({ error: '请提供部门ID' }, { status: 400 });
    }

    const targetDeptId = parseInt(departmentId);

    if (!isCompanyLevelRole(currentUser.role)) {
      if (currentUser.departmentId !== targetDeptId) {
        return NextResponse.json({ error: '无权限查询其他部门用户' }, { status: 403 });
      }
    }

    const users = await prisma.user.findMany({
      where: {
        departmentId: targetDeptId,
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
      orderBy: { name: 'asc' },
    });

    const result = users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name || '',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get users by department error:', error);
    return NextResponse.json({ error: '获取部门用户失败' }, { status: 500 });
  }
}