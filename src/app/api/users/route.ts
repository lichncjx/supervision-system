import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/server-auth';
import { Role } from '@prisma/client';

const PROTECTED_USERNAMES = ['admin', 'supervisor', 'president', 'vice_president', 'dept_leader', 'dept_manager'];

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

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: { department: true },
      orderBy: { id: 'asc' },
    });

    const result = users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.department?.name || '',
      isActive: user.isActive,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      isProtected: PROTECTED_USERNAMES.includes(user.username),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const { username, password, name, role, departmentId, email, phone } = await request.json();

    if (!username || !password || !name || !role || !departmentId) {
      return NextResponse.json({ error: '必填字段不能为空' }, { status: 400 });
    }

    if (PROTECTED_USERNAMES.includes(username)) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json({ error: '部门不存在' }, { status: 400 });
    }

    const validRoles = Object.values(Role);
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json({ error: '无效的角色' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        name,
        role: role as Role,
        departmentId,
        email,
        phone,
        isActive: true,
      },
      include: { department: true },
    });

    return NextResponse.json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      departmentId: newUser.departmentId,
      departmentName: newUser.department?.name || '',
      isActive: newUser.isActive,
      email: newUser.email,
      phone: newUser.phone,
      createdAt: newUser.createdAt,
      isProtected: false,
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
