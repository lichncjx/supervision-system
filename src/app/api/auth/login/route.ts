import { NextResponse } from 'next/server';
import prisma from '@/shared/db/prisma';
import { verifyPassword } from '@/shared/auth/password';
import { generateToken } from '@/shared/auth/jwt';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      include: { department: true },
    });

    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: '账号已停用' }, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const token = generateToken(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name || '',
        isActive: user.isActive,
      },
    });

    const isHttps = request.headers.get('x-forwarded-proto') === 'https' || 
                   process.env.NODE_ENV !== 'production';

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}
