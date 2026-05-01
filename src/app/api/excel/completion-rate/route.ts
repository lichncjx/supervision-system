import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';

function isCompanyLevelRole(role: string): boolean {
  const companyRoles: string[] = ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'];
  return companyRoles.includes(role);
}

async function getDepartmentStatsForExcel(
  departmentId: number,
  departmentName: string,
  typeFilter?: string,
  startDate?: Date,
  endDate?: Date
) {
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

  const priorityRate = priorityTotal > 0 ? Math.round((priorityCompleted / priorityTotal) * 10000) / 100 : 0;
  const mainRate = mainTotal > 0 ? Math.round((mainCompleted / mainTotal) * 10000) / 100 : 0;
  const todoRate = todoTotal > 0 ? Math.round((todoCompleted / todoTotal) * 10000) / 100 : 0;

  return {
    departmentName,
    priorityTotal,
    priorityCompleted,
    priorityRate,
    mainTotal,
    mainCompleted,
    mainRate,
    todoTotal,
    todoCompleted,
    todoRate,
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

    if (!isCompanyLevel) {
      return NextResponse.json({ error: '无权导出完成率统计' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    const departments = await prisma.department.findMany({
      where: { isBusiness: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const stats = await Promise.all(
      departments.map((dept) =>
        getDepartmentStatsForExcel(dept.id, dept.name, undefined, startDate, endDate)
      )
    );

    const today = new Date().toISOString().split('T')[0];

    const headers = [
      '序号',
      '部门',
      '重点工作总数',
      '重点工作已完成',
      '重点工作完成率',
      '主要工作总数',
      '主要工作已完成',
      '主要工作完成率',
      '待办事项总数',
      '待办已完成',
      '待办完成率',
      '总事项数',
      '总完成数',
      '总完成率',
      '超期数',
      '取消数',
    ];

    const rows = stats.map((stat, index) => [
      index + 1,
      stat.departmentName,
      stat.priorityTotal,
      stat.priorityCompleted,
      stat.priorityRate + '%',
      stat.mainTotal,
      stat.mainCompleted,
      stat.mainRate + '%',
      stat.todoTotal,
      stat.todoCompleted,
      stat.todoRate + '%',
      stat.total,
      stat.completed,
      stat.completionRate + '%',
      stat.overdue,
      stat.cancelled,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '完成率统计');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'export',
        module: 'excel',
        targetType: 'completion_rate',
        targetId: 0,
        description: '导出完成率统计',
      },
    });

    const fileName = `完成率统计_${today}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Completion rate export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}