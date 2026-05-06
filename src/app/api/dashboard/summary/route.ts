import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/server-auth'
import { WorkItemStatus, WorkItemType, User, Role } from '@prisma/client'

function isCompanyLevelRole(role: string): boolean {
  const companyRoles: string[] = ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT']
  return companyRoles.includes(role)
}

function isWorkRelatedToDepartment(workItem: any, departmentId: number): boolean {
  if (workItem.departmentId === departmentId) return true
  if (workItem.departmentIds && workItem.departmentIds.includes(departmentId)) return true
  if (workItem.cooperateDepartmentIds && workItem.cooperateDepartmentIds.includes(departmentId)) return true
  return false
}

function canApproveWorkOnServer(user: User, workItem: any): boolean {
  const pendingStatuses = [
    WorkItemStatus.PENDING_DEPT,
    WorkItemStatus.PENDING_COMPANY,
    WorkItemStatus.PENDING_EVIDENCE_DEPT,
    WorkItemStatus.PENDING_EVIDENCE_COMPANY,
    WorkItemStatus.CANCELLING,
    WorkItemStatus.PENDING_MAIN_LEADER_CANCEL,
    WorkItemStatus.ADJUSTING,
  ]

  if (!pendingStatuses.includes(workItem.status)) {
    return false
  }

  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) {
    return false
  }

  if (user.role === Role.DEPARTMENT_LEADER) {
    return (
      isWorkRelatedToDepartment(workItem, user.departmentId) &&
      (
        workItem.status === WorkItemStatus.PENDING_DEPT ||
        workItem.status === WorkItemStatus.PENDING_EVIDENCE_DEPT ||
        workItem.status === WorkItemStatus.ADJUSTING ||
        workItem.status === WorkItemStatus.CANCELLING
      )
    )
  }

  if (
    workItem.status === WorkItemStatus.PENDING_COMPANY ||
    workItem.status === WorkItemStatus.PENDING_EVIDENCE_COMPANY
  ) {
    return isSelectedCompanyApproverOnServer(user, workItem)
  }

  if (
    workItem.status === WorkItemStatus.CANCELLING ||
    workItem.status === WorkItemStatus.ADJUSTING
  ) {
    return isSelectedCompanyApproverOnServer(user, workItem)
  }

  if (workItem.status === WorkItemStatus.PENDING_MAIN_LEADER_CANCEL) {
    return user.role === Role.PRESIDENT
  }

  return false
}

function isSelectedCompanyApproverOnServer(user: User, workItem: any): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) {
    return false
  }

  if (workItem.currentApproverId) {
    return workItem.currentApproverId === user.id
  }

  if (workItem.currentApproverRole) {
    return workItem.currentApproverRole === user.role
  }

  if (
    (workItem.action === 'ADJUST' || workItem.action === 'CANCEL') &&
    workItem.approvalLeaderId
  ) {
    return workItem.approvalLeaderId === user.id
  }

  if (
    workItem.type === WorkItemType.TODO &&
    workItem.status === WorkItemStatus.PENDING_COMPANY &&
    workItem.proposedLeaderId
  ) {
    return workItem.proposedLeaderId === user.id
  }

  if (
    (workItem.type === WorkItemType.PRIORITY || workItem.type === WorkItemType.MAIN) &&
    (
      workItem.status === WorkItemStatus.PENDING_COMPANY ||
      workItem.status === WorkItemStatus.PENDING_EVIDENCE_COMPANY
    )
  ) {
    return user.role === Role.VICE_PRESIDENT
  }

  return false
}

function canHandleWorkOnServer(user: User, workItem: any): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) {
    return false
  }

  if (workItem.status === WorkItemStatus.DRAFT && workItem.creatorId === user.id) {
    return true
  }

  if (workItem.status === WorkItemStatus.REJECTED && workItem.creatorId === user.id) {
    return true
  }

  if (
    workItem.status === WorkItemStatus.REJECTED &&
    (user.role === Role.DEPARTMENT_MANAGER || user.role === Role.DEPARTMENT_LEADER) &&
    isWorkRelatedToDepartment(workItem, user.departmentId)
  ) {
    return true
  }

  if (
    workItem.type === 'TODO' &&
    workItem.status === WorkItemStatus.PENDING_DECOMPOSE &&
    (user.role === Role.DEPARTMENT_MANAGER || user.role === Role.DEPARTMENT_LEADER) &&
    isWorkRelatedToDepartment(workItem, user.departmentId)
  ) {
    return true
  }

  if (
    (workItem.type === 'PRIORITY' || workItem.type === 'MAIN') &&
    workItem.status === WorkItemStatus.APPROVED &&
    (user.role === Role.DEPARTMENT_MANAGER || user.role === Role.DEPARTMENT_LEADER) &&
    isWorkRelatedToDepartment(workItem, user.departmentId)
  ) {
    return true
  }

  if (
    workItem.type === 'TODO' &&
    workItem.status === WorkItemStatus.IN_PROGRESS &&
    (user.role === Role.DEPARTMENT_MANAGER || user.role === Role.DEPARTMENT_LEADER) &&
    isWorkRelatedToDepartment(workItem, user.departmentId)
  ) {
    return true
  }

  return false
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

    const isCompanyLevel = isCompanyLevelRole(currentUser.role)
    const departmentIdFilter = isCompanyLevel ? undefined : currentUser.departmentId

    const whereClause: any = departmentIdFilter
      ? { departmentId: departmentIdFilter }
      : {}

    const allRelevantWorks = await prisma.workItem.findMany({
      where: departmentIdFilter
        ? {
            OR: [
              { departmentId: departmentIdFilter },
              { departmentIds: { has: departmentIdFilter } },
              { cooperateDepartmentIds: { has: departmentIdFilter } },
              { currentApproverId: currentUser.id },
            ],
          }
        : {},
    })

    let pendingApproveCount = 0
    let pendingHandleCount = 0
    let pendingProcessCount = 0

    for (const workItem of allRelevantWorks) {
      const canApprove = canApproveWorkOnServer(currentUser, workItem)
      const canHandle = canHandleWorkOnServer(currentUser, workItem)

      if (canApprove) pendingApproveCount++
      if (canHandle) pendingHandleCount++
      if (canApprove || canHandle) pendingProcessCount++
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
    ])

    return NextResponse.json({
      priorityTotal,
      mainTotal,
      todoTotal,
      pendingApprove: pendingApproveCount,
      pendingHandle: pendingHandleCount,
      pendingProcess: pendingProcessCount,
      inProgress: inProgressList,
      completed: completedList,
      cancelled: cancelledList,
      overdue: overdueList,
      thisMonthDue: thisMonthList,
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}
