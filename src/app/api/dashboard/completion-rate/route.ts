import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';

function isCompanyLevelRole(role: string): boolean {
  const companyRoles: string[] = ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'];
  return companyRoles.includes(role);
}

interface DepartmentStats {
  departmentId: number;
  departmentName: string;
  priorityTotal: number;
  priorityCompleted: number;
  mainTotal: number;
  mainCompleted: number;
  todoTotal: number;
  todoCompleted: number;
  total: number;
  completed: number;
  cancelled: number;
  overdue: number;
  completionRate: number;
}

async function getDepartmentStats(
  departmentId: number,
  departmentName: string,
  typeFilter?: string,
  startDate?: Date,
  endDate?: Date
): Promise<DepartmentStats> {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = startDate;
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter.lte = end;
  }

  const baseWhere: any = { departmentId };
  if (Object.keys(dateFilter).length > 0) {
    baseWhere.createdAt = dateFilter;
  }

  const priorityWhere = { ...baseWhere, type: 'PRIORITY' as const };
  const mainWhere = { ...baseWhere, type: 'MAIN' as const };
  const todoWhere = { ...baseWhere, type: 'TODO' as const };

  const overdueCondition = {
    status: { notIn: ['COMPLETED', 'CANCELLED'] as const },
    OR: [
      { type: { in: ['PRIORITY', 'MAIN'] as const }, completeTime: { lt: new Date() } },
      { type: 'TODO' as const, planCompleteTime: { lt: new Date() } },
    ],
  };

  const [
    priorityTotal,
    priorityCompleted,
    mainTotal,
    mainCompleted,
    todoTotal,
    todoCompleted,
    cancelled,
    overdue,
  ] = await Promise.all([
    prisma.workItem.count({ where: priorityWhere }),
    prisma.workItem.count({ where: { ...priorityWhere, status: 'COMPLETED' } }),
    prisma.workItem.count({ where: mainWhere }),
    prisma.workItem.count({ where: { ...mainWhere, status: 'COMPLETED' } }),
    prisma.workItem.count({ where: todoWhere }),
    prisma.workItem.count({ where: { ...todoWhere, status: 'COMPLETED' } }),
    prisma.workItem.count({ where: { ...baseWhere, status: 'CANCELLED' } }),
    prisma.workItem.count({ where: { ...baseWhere, ...overdueCondition } }),
  ]);

  const total = priorityTotal + mainTotal + todoTotal;
  const completed = priorityCompleted + mainCompleted + todoCompleted;
  const validTotal = total - cancelled;
  const completionRate = validTotal > 0 ? Math.round((completed / validTotal) * 10000) / 100 : 0;

  return {
    departmentId,
    departmentName,
    priorityTotal,
    priorityCompleted,
    mainTotal,
    mainCompleted,
    todoTotal,
    todoCompleted,
    total,
    completed,
    cancelled,
    overdue,
    completionRate,
  };
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

    const isCompanyLevel = isCompanyLevelRole(currentUser.role);

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    let departments;
    if (isCompanyLevel) {
      departments = await prisma.department.findMany({
        where: { isBusiness: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    } else {
      const dept = await prisma.department.findUnique({
        where: { id: currentUser.departmentId },
        select: { id: true, name: true },
      });
      departments = dept ? [dept] : [];
    }

    const statsPromises = departments.map((dept) =>
      getDepartmentStats(dept.id, dept.name, typeFilter || undefined, startDate, endDate)
    );

    const stats = await Promise.all(statsPromises);

    return NextResponse.json({
      items: stats,
      total: stats.length,
    });
  } catch (error) {
    console.error('Completion rate error:', error);
    return NextResponse.json({ error: '获取完成率统计失败' }, { status: 500 });
  }
}