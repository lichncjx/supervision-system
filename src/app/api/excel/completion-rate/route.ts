import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { getUserFromToken, isSupervisionAdmin } from '@/lib/server-auth';
import { getResponsibleDepartmentIds } from '@/lib/server-permissions';

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

  const filters: any[] = [
    {
      OR: [
        { departmentId },
        { responsibleDepartmentIds: { has: departmentId } },
      ],
    },
  ];

  if (Object.keys(dateFilter).length > 0) {
    filters.push({ createdAt: dateFilter });
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

    if (!isSupervisionAdmin(currentUser.role)) {
      return NextResponse.json({ error: '无权导出完成率统计，仅限系统管理员和督办管理员' }, { status: 403 });
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

    const stats = [];
    for (const dept of departments) {
      stats.push(await getDepartmentStatsForExcel(dept.id, dept.name, undefined, startDate, endDate));
    }

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

    prisma.operationLog.create({
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
    }).catch((logError) => {
      console.error('Failed to write operation log:', logError);
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
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('Completion rate export error:', message);
    return NextResponse.json({ error: `导出失败: ${message}` }, { status: 500 });
  }
}
