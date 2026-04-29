import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './auth';

export async function authMiddleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  
  if (!token) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const session = verifyToken(token);
  if (!session) {
    return NextResponse.json({ error: '无效的令牌' }, { status: 401 });
  }

  return session;
}

export function checkPermission(session: any, requiredRole?: string, departmentId?: number) {
  // 管理员拥有所有权限
  if (session.role === 'admin') {
    return true;
  }

  // 检查角色权限
  if (requiredRole && session.role !== requiredRole) {
    // 公司领导拥有更高权限
    if (session.role === 'vice_president' || session.role === 'president') {
      return true;
    }
    return false;
  }

  // 检查部门权限
  if (departmentId && session.departmentId && session.departmentId !== departmentId) {
    // 公司领导可以访问所有部门
    if (session.role === 'vice_president' || session.role === 'president') {
      return true;
    }
    return false;
  }

  return true;
}
