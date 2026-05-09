import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/server-auth'
import { WorkItemStatus } from '@prisma/client'
import {
  buildWorkVisibilityWhere,
  canApproveWorkItem,
  canHandleWorkItem,
} from '@/lib/server-permissions'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const currentUser = await getUserFromToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const whereClause = buildWorkVisibilityWhere(currentUser)

    const allRelevantWorks = await prisma.workItem.findMany({
      where: whereClause,
    })

    let approving = 0
    let handling = 0

    for (const workItem of allRelevantWorks) {
      const canApprove = canApproveWorkItem(currentUser, workItem)
      const canHandle = canHandleWorkItem(currentUser, workItem)

      if (canApprove) approving++
      if (canHandle) handling++
    }

    const [
      priorityTotal,
      mainTotal,
      todoTotal,
      inProgressList,
      completedList,
      cancelledList,
      overdueList,
      thisMonthList,
      priorityCompleted,
      mainCompleted,
      todoCompleted,
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
      prisma.workItem.count({
        where: { ...whereClause, type: 'PRIORITY', status: WorkItemStatus.COMPLETED },
      }),
      prisma.workItem.count({
        where: { ...whereClause, type: 'MAIN', status: WorkItemStatus.COMPLETED },
      }),
      prisma.workItem.count({
        where: { ...whereClause, type: 'TODO', status: WorkItemStatus.COMPLETED },
      }),
    ])

    return NextResponse.json({
      priorityTotal,
      mainTotal,
      todoTotal,
      approving,
      handling,
      inProgress: inProgressList,
      completed: completedList,
      cancelled: cancelledList,
      overdue: overdueList,
      thisMonthDue: thisMonthList,
      priorityCompleted,
      mainCompleted,
      todoCompleted,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}
