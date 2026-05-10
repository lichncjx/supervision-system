import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import {
  buildWorkVisibilityWhere,
  getResponsibleDepartmentIds,
  isDepartmentLevelRole,
  isGlobalViewRole,
} from '@/lib/server-permissions';

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
  visibilityWhere: any,
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

  const filters: any[] = [
    visibilityWhere,
    { departmentId },
  ];

  if (Object.keys(dateFilter).length > 0) {
    filters.push({ createdAt: dateFilter });
  }

  if (typeFilter) {
    filters.push({ type: typeFilter.toUpperCase() });
  }

  const works = await prisma.workItem.findMany({
    where: { AND: filters },
  });

  const responsibleWorks = works.filter((work) =>
    getResponsibleDepartmentIds(work).includes(departmentId)
  );

  const priority = responsibleWorks.filter((work) => work.type === 'PRIORITY');
  const main = responsibleWorks.filter((work) => work.type === 'MAIN');
  const todo = responsibleWorks.filter((work) => work.type === 'TODO');
  const isCompleted = (work: (typeof responsibleWorks)[number]) => work.status === 'COMPLETED';
  const isCancelled = (work: (typeof responsibleWorks)[number]) => work.status === 'CANCELLED';
  const isOverdue = (work: (typeof responsibleWorks)[number]) => {
    if (isCompleted(work) || isCancelled(work)) return false;
    const due = work.type === 'TODO' ? work.planCompleteTime : work.completeTime;
    return due ? due < new Date() : false;
  };

  const priorityTotal = priority.length;
  const priorityCompleted = priority.filter(isCompleted).length;
  const mainTotal = main.length;
  const mainCompleted = main.filter(isCompleted).length;
  const todoTotal = todo.length;
  const todoCompleted = todo.filter(isCompleted).length;
  const cancelled = responsibleWorks.filter(isCancelled).length;
  const overdue = responsibleWorks.filter(isOverdue).length;

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

    const visibilityWhere = buildWorkVisibilityWhere(currentUser);

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    let departments;
    if (isGlobalViewRole(currentUser.role)) {
      departments = await prisma.department.findMany({
        where: { isBusiness: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    } else if (isDepartmentLevelRole(currentUser.role)) {
      const dept = await prisma.department.findUnique({
        where: { id: currentUser.departmentId },
        select: { id: true, name: true },
      });
      departments = dept ? [dept] : [];
    } else {
      const visibleWorks = await prisma.workItem.findMany({
        where: visibilityWhere,
        select: {
          departmentId: true,
        },
      });
      const responsibleDepartmentIds = Array.from(
        new Set(visibleWorks.flatMap((work) => getResponsibleDepartmentIds(work)))
      );
      departments = responsibleDepartmentIds.length > 0
        ? await prisma.department.findMany({
            where: { id: { in: responsibleDepartmentIds }, isBusiness: true },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          })
        : [];
    }

    const statsPromises = departments.map((dept) =>
      getDepartmentStats(dept.id, dept.name, visibilityWhere, typeFilter || undefined, startDate, endDate)
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
