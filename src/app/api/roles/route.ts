import { NextResponse, NextRequest } from 'next/server';
import { verifyToken } from '@/lib/server-auth';
import { Role } from '@prisma/client';

const ROLE_NAMES: Record<Role, string> = {
  ADMIN: '系统管理员',
  SUPERVISOR: '督办管理员',
  DEPARTMENT_MANAGER: '部门主管',
  DEPARTMENT_LEADER: '部门领导',
  VICE_PRESIDENT: '公司主管领导',
  PRESIDENT: '公司主要领导',
};

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

    const roles = Object.values(Role).map(role => ({
      value: role,
      label: ROLE_NAMES[role],
    }));

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: '获取角色列表失败' }, { status: 500 });
  }
}
