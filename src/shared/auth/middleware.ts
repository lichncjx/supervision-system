import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './jwt'

export async function authMiddleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const session = verifyToken(token)
  if (!session) {
    return NextResponse.json({ error: '无效的令牌' }, { status: 401 })
  }

  return session
}

export function checkPermission(
  session: any,
  requiredRole?: string,
  departmentId?: number,
) {
  if (session.role === 'ADMIN') {
    return true
  }

  if (requiredRole && session.role !== requiredRole) {
    if (
      session.role === 'VICE_PRESIDENT' ||
      session.role === 'PRESIDENT'
    ) {
      return true
    }
    return false
  }

  if (
    departmentId &&
    session.departmentId &&
    session.departmentId !== departmentId
  ) {
    if (
      session.role === 'VICE_PRESIDENT' ||
      session.role === 'PRESIDENT'
    ) {
      return true
    }
    return false
  }

  return true
}
