import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/server-auth';
import { formatDate, processNodesForDisplay, processAdjustHistory, convertToDateTime } from '@/lib/utils';
import { Role, WorkItemType, WorkItemStatus } from '@prisma/client';

const ROLES_CAN_VIEW_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.VICE_PRESIDENT, Role.PRESIDENT];
const ROLES_CAN_CREATE_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR];
const ROLES_CAN_CREATE_TODO_ONLY: Role[] = [Role.VICE_PRESIDENT, Role.PRESIDENT];
const ROLES_CAN_CREATE_DEPT: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER];

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const keyword = searchParams.get('keyword');

    let where: any = {};

    if (type) {
      let workType: WorkItemType;
      if (type.toLowerCase() === 'priority' || type === 'PRIORITY') {
        workType = WorkItemType.PRIORITY;
      } else if (type.toLowerCase() === 'main' || type === 'MAIN') {
        workType = WorkItemType.MAIN;
      } else if (type.toLowerCase() === 'todo' || type === 'TODO') {
        workType = WorkItemType.TODO;
      } else {
        return NextResponse.json({ error: '无效的事项类型' }, { status: 400 });
      }
      where.type = workType;
    }

    if (status) {
      where.status = status;
    }

    if (!ROLES_CAN_VIEW_ALL.includes(currentUser.role)) {
      where.departmentId = currentUser.departmentId;
    }

    if (departmentId && ROLES_CAN_VIEW_ALL.includes(currentUser.role)) {
      where.departmentId = Number(departmentId);
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { workItem: { contains: keyword, mode: 'insensitive' } },
        { businessCategory: { contains: keyword, mode: 'insensitive' } },
        { proposedScene: { contains: keyword, mode: 'insensitive' } },
        { progress: { contains: keyword, mode: 'insensitive' } },
        { workPlan: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const works = await prisma.workItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: true,
        creator: { select: { name: true, role: true } },
        proposedLeader: { select: { id: true, name: true } },
      },
    });



    const result = works.map((work) => ({
      id: work.id,
      title: work.title,
      type: work.type === 'PRIORITY' ? '重点' : work.type === 'MAIN' ? '主要' : '待办',
      status: work.status,
      departmentId: work.departmentId,
      departmentIds: work.departmentIds as number[] || [],
      departmentName: work.department?.name || '-',
      creatorId: work.creatorId,
      creatorName: work.creator?.name || '-',
      creatorRole: work.creator?.role || '-',
      workItem: work.workItem,
      workNode: work.workNode,
      businessCategory: work.businessCategory,
      completeTime: formatDate(work.completeTime),
      completeForm: work.completeForm,
      isInnovation: work.isInnovation,
      responsibleLeader: work.responsibleLeader,
      supervisor: work.supervisor,
      proposedLeader: work.proposedLeader?.name || null,
      proposedLeaderId: work.proposedLeaderId,
      proposedScene: work.proposedScene,
      formedTime: formatDate(work.formedTime),
      responsiblePersons: work.responsiblePersons as string[] || [],
      cooperateDepartmentIds: work.cooperateDepartmentIds as number[] || [],
      cooperatePersons: work.cooperatePersons as string[] || [],
      workPlan: work.workPlan,
      planCompleteTime: formatDate(work.planCompleteTime),
      progress: work.progress,
      action: work.action,
      approvalLeaderId: work.approvalLeaderId,
      currentApproverId: work.currentApproverId,
      currentApproverRole: work.currentApproverRole,
      firstSubmitterId: work.firstSubmitterId,
      nodes: work.nodes ? processNodesForDisplay(JSON.parse(String(work.nodes))) : [],
      adjustHistory: work.adjustHistory ? processAdjustHistory(work.adjustHistory as any[]) : [],
      createdAt: work.createdAt.toISOString(),
      updatedAt: work.updatedAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get works error:', error);
    return NextResponse.json({ error: '获取事项列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    const body = await request.json();
    const { type, departmentId, ...rest } = body;

    let workType: WorkItemType;
    if (type === '重点' || type === 'PRIORITY' || type === 'priority') {
      workType = WorkItemType.PRIORITY;
    } else if (type === '主要' || type === 'MAIN' || type === 'main') {
      workType = WorkItemType.MAIN;
    } else if (type === '待办' || type === 'TODO' || type === 'todo') {
      workType = WorkItemType.TODO;
    } else {
      return NextResponse.json({ error: '无效的事项类型' }, { status: 400 });
    }

    if (!ROLES_CAN_CREATE_ALL.includes(currentUser.role)) {
      if (ROLES_CAN_CREATE_TODO_ONLY.includes(currentUser.role) && workType !== WorkItemType.TODO) {
        return NextResponse.json({ error: '公司领导只能创建待办事项' }, { status: 403 });
      }

      if (ROLES_CAN_CREATE_DEPT.includes(currentUser.role)) {
        if (departmentId !== currentUser.departmentId) {
          return NextResponse.json({ error: '只能创建本部门事项' }, { status: 403 });
        }
      }
    }

    if (!departmentId) {
      return NextResponse.json({ error: '请指定责任部门' }, { status: 400 });
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return NextResponse.json({ error: '责任部门不存在' }, { status: 400 });
    }

    const processNodes = (nodes: any[]) => {
      return nodes.map(node => ({
        ...node,
        completeTime: node.completeTime ? new Date(node.completeTime + 'T00:00:00.000Z').toISOString() : null,
        children: node.children ? node.children.map((child: any) => ({
          ...child,
          completeTime: child.completeTime ? new Date(child.completeTime + 'T00:00:00.000Z').toISOString() : null
        })) : []
      }));
    };

    const workData: any = {
      type: workType,
      title: rest.title || rest.workItem || '未命名事项',
      departmentId,
      creatorId: currentUser.id,
      status: WorkItemStatus.DRAFT,
      workItem: rest.workItem,
      workNode: rest.workNode,
      businessCategory: rest.businessCategory,
      completeTime: convertToDateTime(rest.completeTime),
      completeForm: rest.completeForm,
      isInnovation: rest.isInnovation || false,
      // responsibleLeader: 部门领导姓名快照（legacy，未来迁移为 deptLeaderName）
      responsibleLeader: rest.responsibleLeader,
      // supervisor: 主管人员姓名快照（legacy，未来迁移为 deptManagerName，非系统角色 SUPERVISOR）
      supervisor: rest.supervisor,
      // proposedLeaderId: 提出领导 ID（真实关联字段）
      proposedLeaderId: rest.proposedLeaderId,
      // approvalLeaderId: 审批领导 ID，默认等于 proposedLeaderId
      // 只有特殊情况才允许单独指定
      approvalLeaderId: rest.approvalLeaderId || rest.proposedLeaderId,
      proposedScene: rest.proposedScene,
      formedTime: convertToDateTime(rest.formedTime),
      departmentIds: rest.departmentIds || (departmentId ? [departmentId] : []),
      responsiblePersons: rest.responsiblePersons,
      cooperateDepartmentIds: rest.cooperateDepartmentIds,
      cooperatePersons: rest.cooperatePersons,
      workPlan: rest.workPlan,
      planCompleteTime: convertToDateTime(rest.planCompleteTime),
      progress: rest.progress,
      nodes: rest.nodes ? JSON.stringify(processNodes(rest.nodes)) : null,
    };

    const work = await prisma.workItem.create({
      data: workData,
      include: {
        department: true,
        proposedLeader: { select: { id: true, name: true } },
      },
    });

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
    });

    const result = {
      id: work.id,
      title: work.title,
      type: work.type === 'PRIORITY' ? '重点' : work.type === 'MAIN' ? '主要' : '待办',
      departmentId: work.departmentId,
      departmentIds: work.departmentIds as number[] || [],
      departmentName: work.department?.name || '-',
      proposedLeader: work.proposedLeader?.name || null,
      proposedLeaderId: work.proposedLeaderId,
      status: work.status,
      createdAt: work.createdAt.toISOString(),
      updatedAt: work.updatedAt.toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create work error:', error);
    return NextResponse.json({ error: '创建事项失败' }, { status: 500 });
  }
}
