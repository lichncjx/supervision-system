import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/server-auth'
import { WorkItemType, type WorkItemStatus } from '@prisma/client'
import {
  canApproveWorkItem,
  canHandleWorkItem,
  canViewWorkItem,
  buildWorkItemVisibilityWhere,
} from '@/lib/server-permissions'
import {
  getTargetWorkItemStatus,
  getWorkItemDueDate,
  isTargetInProgressStatus,
  isTargetTerminalStatus,
} from '@/lib/work-item-status'

const EXPIRING_DAYS = 7

function isOverdueWorkItem(workItem: {
  status: WorkItemStatus
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}, now: Date): boolean {
  if (isTargetTerminalStatus(workItem.status)) return false

  const dueDate = getWorkItemDueDate(workItem)
  return dueDate ? dueDate < now : false
}

function isExpiringWorkItem(workItem: {
  status: WorkItemStatus
  type: WorkItemType
  completeTime: Date | null
  planCompleteTime: Date | null
}, now: Date): boolean {
  if (isTargetTerminalStatus(workItem.status)) return false

  const dueDate = getWorkItemDueDate(workItem)
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

    const visibilityWhere = buildWorkItemVisibilityWhere(currentUser)
    const allRelevantWorks = await prisma.workItem.findMany({
      where: visibilityWhere,
    })
    const visibleWorks = allRelevantWorks.filter((workItem) =>
      canViewWorkItem(currentUser, workItem)
    )
    const now = new Date()

    const priorityWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.PRIORITY)
    const mainWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.MAIN)
    const todoWorks = visibleWorks.filter((workItem) => workItem.type === WorkItemType.TODO)
    const completedWorks = visibleWorks.filter(
      (workItem) => getTargetWorkItemStatus(workItem.status) === 'COMPLETED'
    )
    const expiringWorks = visibleWorks.filter((workItem) => isExpiringWorkItem(workItem, now))

    return NextResponse.json({
      priorityTotal: priorityWorks.length,
      mainTotal: mainWorks.length,
      todoTotal: todoWorks.length,
      approving: visibleWorks.filter((workItem) => canApproveWorkItem(currentUser, workItem)).length,
      handling: visibleWorks.filter((workItem) => canHandleWorkItem(currentUser, workItem)).length,
      inProgress: visibleWorks.filter((workItem) => isTargetInProgressStatus(workItem.status)).length,
      completed: completedWorks.length,
      cancelled: visibleWorks.filter(
        (workItem) => getTargetWorkItemStatus(workItem.status) === 'CANCELLED'
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
