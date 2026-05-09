import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/server-auth'
import { WorkItemStatus, WorkItemType } from '@prisma/client'
import {
  buildWorkVisibilityWhere,
  canApproveWorkItem,
  canHandleWorkItem,
  canViewWorkItem,
} from '@/lib/server-permissions'

const EXPIRING_DAYS = 7

const TARGET_IN_PROGRESS_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.APPROVED,
  WorkItemStatus.IN_PROGRESS,
]

const TARGET_COMPLETED_STATUSES: WorkItemStatus[] = [WorkItemStatus.COMPLETED]
const TARGET_CANCELLED_STATUSES: WorkItemStatus[] = [WorkItemStatus.CANCELLED]
const TARGET_TERMINAL_STATUSES: WorkItemStatus[] = [
  ...TARGET_COMPLETED_STATUSES,
  ...TARGET_CANCELLED_STATUSES,
]

function getWorkDueDate(workItem: {
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}): Date | null {
  return workItem.type === WorkItemType.TODO
    ? workItem.planCompleteTime
    : workItem.completeTime
}

function isOverdueWorkItem(workItem: {
  status: WorkItemStatus
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}, now: Date): boolean {
  if (TARGET_TERMINAL_STATUSES.includes(workItem.status)) return false

  const dueDate = getWorkDueDate(workItem)
  return dueDate ? dueDate < now : false
}

function isExpiringWorkItem(workItem: {
  status: WorkItemStatus
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}, now: Date): boolean {
  if (TARGET_TERMINAL_STATUSES.includes(workItem.status)) return false

  const dueDate = getWorkDueDate(workItem)
  if (!dueDate) return false

  const deadline = new Date(now)
  deadline.setDate(deadline.getDate() + EXPIRING_DAYS)

  return dueDate >= now && dueDate <= deadline
}

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
    const visibleWorks = allRelevantWorks.filter((workItem) =>
      canViewWorkItem(currentUser, workItem)
    )
    const now = new Date()

    const priorityWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.PRIORITY)
    const mainWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.MAIN)
    const todoWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.TODO)
    const completedWorks = visibleWorks.filter((workItem) =>
      TARGET_COMPLETED_STATUSES.includes(workItem.status)
    )
    const expiringWorks = visibleWorks.filter((workItem) =>
      isExpiringWorkItem(workItem, now)
    )

    return NextResponse.json({
      priorityTotal: priorityWorks.length,
      mainTotal: mainWorks.length,
      todoTotal: todoWorks.length,
      approving: visibleWorks.filter((workItem) => canApproveWorkItem(currentUser, workItem)).length,
      handling: visibleWorks.filter((workItem) => canHandleWorkItem(currentUser, workItem)).length,
      inProgress: visibleWorks.filter((workItem) =>
        TARGET_IN_PROGRESS_STATUSES.includes(workItem.status)
      ).length,
      completed: completedWorks.length,
      cancelled: visibleWorks.filter((workItem) =>
        TARGET_CANCELLED_STATUSES.includes(workItem.status)
      ).length,
      overdue: visibleWorks.filter((workItem) => isOverdueWorkItem(workItem, now)).length,
      expiring: expiringWorks.length,
      thisMonthDue: expiringWorks.length,
      priorityCompleted: priorityWorks.filter((workItem) => completedWorks.includes(workItem)).length,
      mainCompleted: mainWorks.filter((workItem) => completedWorks.includes(workItem)).length,
      todoCompleted: todoWorks.filter((workItem) => completedWorks.includes(workItem)).length,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}
