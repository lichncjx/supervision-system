import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/server-auth'
import { Role, WorkItemType, WorkItemStatus } from '@prisma/client'
import { parseWorkQuery, parseWorkType, parseWorkStatusFilter } from '@/features/works/presentation/work.validators'
import { queryWorksUseCase } from '@/features/works/application/query-works.usecase'

const ROLES_CAN_CREATE_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR]
const ROLES_CAN_CREATE_TODO_ONLY: Role[] = [Role.VICE_PRESIDENT, Role.PRESIDENT]
const ROLES_CAN_CREATE_DEPT: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER]

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = parseWorkQuery(searchParams)

    if (params.type) {
      const workType = parseWorkType(params.type)
      if (!workType) {
        return NextResponse.json({ error: '无效的事项类型' }, { status: 400 })
      }
    }

    const statusFilter = parseWorkStatusFilter(params.status)
    if (statusFilter?.kind === 'invalid') {
      return NextResponse.json({ error: '无效的状态筛选' }, { status: 400 })
    }

    const result = await queryWorksUseCase({ currentUser, params })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get works error:', error)
    return NextResponse.json({ error: '获取事项列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 })
    }

    const body = await request.json()
    const { type, departmentId, ...rest } = body

    let workType: WorkItemType
    if (type === '重点' || type === 'PRIORITY' || type === 'priority') {
      workType = WorkItemType.PRIORITY
    } else if (type === '主要' || type === 'MAIN' || type === 'main') {
      workType = WorkItemType.MAIN
    } else if (type === '待办' || type === 'TODO' || type === 'todo') {
      workType = WorkItemType.TODO
    } else {
      return NextResponse.json({ error: '无效的事项类型' }, { status: 400 })
    }

    if (!ROLES_CAN_CREATE_ALL.includes(currentUser.role)) {
      if (
        ROLES_CAN_CREATE_TODO_ONLY.includes(currentUser.role) &&
        workType !== WorkItemType.TODO
      ) {
        return NextResponse.json(
          { error: '公司领导只能创建待办事项' },
          { status: 403 },
        )
      }

      if (ROLES_CAN_CREATE_DEPT.includes(currentUser.role)) {
        if (departmentId !== currentUser.departmentId) {
          return NextResponse.json(
            { error: '只能创建本部门事项' },
            { status: 403 },
          )
        }
      }
    }

    if (!departmentId) {
      return NextResponse.json({ error: '请指定责任部门' }, { status: 400 })
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    })

    if (!department) {
      return NextResponse.json({ error: '责任部门不存在' }, { status: 400 })
    }

    const processNodes = (nodes: any[]) => {
      return nodes.map((node) => ({
        ...node,
        completeTime: node.completeTime
          ? new Date(node.completeTime + 'T00:00:00.000Z').toISOString()
          : null,
        children: node.children
          ? node.children.map((child: any) => ({
              ...child,
              completeTime: child.completeTime
                ? new Date(child.completeTime + 'T00:00:00.000Z').toISOString()
                : null,
            }))
          : [],
      }))
    }

    const workData: any = {
      type: workType,
      title: rest.title || rest.workItem || '未命名事项',
      departmentId,
      creatorId: currentUser.id,
      status: WorkItemStatus.DRAFT,
      workItem: rest.workItem,
      workNode: rest.workNode,
      businessCategory: rest.businessCategory,
      completeTime: rest.completeTime
        ? new Date(rest.completeTime + 'T00:00:00.000Z')
        : null,
      completeForm: rest.completeForm,
      isInnovation: rest.isInnovation || false,
      responsibleLeader: rest.responsibleLeader,
      responsiblePerson: rest.responsiblePerson,
      proposedLeaderId: rest.proposedLeaderId,
      approvalLeaderId: rest.approvalLeaderId || rest.proposedLeaderId,
      proposedScene: rest.proposedScene,
      formedTime: rest.formedTime
        ? new Date(rest.formedTime + 'T00:00:00.000Z')
        : null,
      cooperators: rest.cooperators || undefined,
      workPlan: rest.workPlan,
      planCompleteTime: rest.planCompleteTime
        ? new Date(rest.planCompleteTime + 'T00:00:00.000Z')
        : null,
      progress: rest.progress,
      nodes: rest.nodes ? JSON.stringify(processNodes(rest.nodes)) : null,
    }

    const work = await prisma.workItem.create({
      data: workData,
      include: {
        department: true,
        proposedLeader: { select: { id: true, name: true } },
      },
    })

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        module: 'works',
        targetId: work.id,
        targetType: 'work_item',
        description: `创建${work.type === 'PRIORITY' ? '重点' : work.type === 'MAIN' ? '主要' : '待办'}工作：${work.title}`,
      },
    })

    const result = {
      id: work.id,
      title: work.title,
      type:
        work.type === 'PRIORITY'
          ? '重点'
          : work.type === 'MAIN'
            ? '主要'
            : '待办',
      departmentId: work.departmentId,
      cooperators: work.cooperators,
      departmentName: work.department?.name || '-',
      proposedLeader: work.proposedLeader?.name || null,
      proposedLeaderId: work.proposedLeaderId,
      status: work.status,
      createdAt: work.createdAt.toISOString(),
      updatedAt: work.updatedAt.toISOString(),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Create work error:', error)
    return NextResponse.json({ error: '创建事项失败' }, { status: 500 })
  }
}
