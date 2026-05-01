import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import { WorkItemStatus } from '@prisma/client';

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

    const isCompanyLevel = isCompanyLevelRole(currentUser.role);
    const departmentIdFilter = isCompanyLevel ? undefined : currentUser.departmentId;

    const whereClause: any = departmentIdFilter
      ? { departmentId: departmentIdFilter }
      : {};

    const [
      priorityTotal,
      mainTotal,
      todoTotal,
      pendingList,
      evidencePendingList,
      inProgressList,
      completedList,
      cancelledList,
      overdueList,
      thisMonthList,
    ] = await Promise.all([
      prisma.workItem.count({
        where: { ...whereClause, type: 'PRIORITY' },
      }),
      prisma.workItem.count({
        where: { ...whereClause, type: 'MAIN' },
      }),
      prisma.workItem.count({
        where: { ...whereClause, type: 'TODO' },
      }),
      prisma.workItem.findMany({
        where: {
          ...whereClause,
          status: {
            in: [
              WorkItemStatus.PENDING_DEPT,
              WorkItemStatus.PENDING_COMPANY,
              WorkItemStatus.PENDING_EVIDENCE_DEPT,
              WorkItemStatus.PENDING_EVIDENCE_COMPANY,
              WorkItemStatus.PENDING_MAIN_LEADER_CANCEL,
              WorkItemStatus.PENDING_COMPLETE,
              WorkItemStatus.ADJUSTING,
              WorkItemStatus.CANCELLING,
            ],
          },
        },
        select: { id: true, status: true },
      }),
      prisma.workItem.count({
        where: { ...whereClause, status: WorkItemStatus.APPROVED },
      }),
      prisma.workItem.count({
        where: { ...whereClause, status: WorkItemStatus.IN_PROGRESS },
      }),
      prisma.workItem.count({
        where: { ...whereClause, status: WorkItemStatus.COMPLETED },
      }),
      prisma.workItem.count({
        where: { ...whereClause, status: WorkItemStatus.CANCELLED },
      }),
      prisma.workItem.count({
        where: {
          ...whereClause,
          status: {
            notIn: [WorkItemStatus.COMPLETED, WorkItemStatus.CANCELLED],
          },
          OR: [
            {
              type: { in: ['PRIORITY', 'MAIN'] },
              completeTime: { lt: new Date() },
            },
            {
              type: 'TODO',
              planCompleteTime: { lt: new Date() },
            },
          ],
        },
      }),
      prisma.workItem.count({
        where: {
          ...whereClause,
          status: {
            notIn: [WorkItemStatus.COMPLETED, WorkItemStatus.CANCELLED],
          },
          OR: [
            {
              type: { in: ['PRIORITY', 'MAIN'] },
              completeTime: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
              },
            },
            {
              type: 'TODO',
              planCompleteTime: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
              },
            },
          ],
        },
      }),
    ]);

    const pendingApprove = pendingList.length;
    const pendingEvidence = evidencePendingList;

    return NextResponse.json({
      priorityTotal,
      mainTotal,
      todoTotal,
      pendingApprove,
      pendingEvidence,
      inProgress: inProgressList,
      completed: completedList,
      cancelled: cancelledList,
      overdue: overdueList,
      thisMonthDue: thisMonthList,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
  }
}