import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/shared/db/prisma';
import { getUserFromToken } from '@/shared/auth/get-current-user';
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
        return NextResponse.json({ error: '无权限查询其他部门领导' }, { status: 403 });
      }
    }

    const leaders = await prisma.user.findMany({
      where: {
        departmentId: targetDeptId,
        role: Role.DEPARTMENT_LEADER,
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

    const result = leaders.map((leader) => ({
      id: leader.id,
      name: leader.name,
      role: leader.role,
      departmentId: leader.departmentId,
      departmentName: leader.department?.name || '',
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get department leaders error:', error);
    return NextResponse.json({ error: '获取部门领导失败' }, { status: 500 });
  }
}