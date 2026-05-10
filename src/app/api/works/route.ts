import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/server-auth';
import { formatDate, processNodesForDisplay, processAdjustHistory, convertToDateTime } from '@/lib/utils';
import { Role, WorkItemType, WorkItemStatus } from '@prisma/client';
import { buildWorkVisibilityWhere, canHandleWorkItem } from '@/lib/server-permissions';

const ROLES_CAN_CREATE_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR];
const ROLES_CAN_CREATE_TODO_ONLY: Role[] = [Role.VICE_PRESIDENT, Role.PRESIDENT];
const ROLES_CAN_CREATE_DEPT: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER];
const EXPIRING_DAYS = 7;
const APPROVING_STATUSES = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
];
const TERMINAL_STATUSES: WorkItemStatus[] = [WorkItemStatus.COMPLETED, WorkItemStatus.CANCELLED];

function getDueDate(work: { type: WorkItemType; completeTime: Date | null; planCompleteTime: Date | null }) {
  return work.type === WorkItemType.TODO ? work.planCompleteTime : work.completeTime;
}

function isOverdueWork(work: { type: WorkItemType; status: WorkItemStatus; completeTime: Date | null; planCompleteTime: Date | null }, now: Date) {
  if (TERMINAL_STATUSES.includes(work.status)) return false;
  const dueDate = getDueDate(work);
  return dueDate ? dueDate < now : false;
}

function isExpiringWork(work: { type: WorkItemType; status: WorkItemStatus; completeTime: Date | null; planCompleteTime: Date | null }, now: Date) {
  if (TERMINAL_STATUSES.includes(work.status)) return false;
  const dueDate = getDueDate(work);
  if (!dueDate) return false;
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + EXPIRING_DAYS);
  return dueDate >= now && dueDate <= deadline;
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeStatusQuery(status: string | null) {
  if (!status) return null;
  const normalized = status.trim();
  const lower = normalized.toLowerCase();
  if (!normalized) return null;

  if (lower === 'draft') {
    return {
      kind: 'where' as const,
      where: {
        status: WorkItemStatus.DRAFT,
        rejectReason: null,
        rejectedFromStatus: null,
      },
    };
  }

  if (lower === 'returneddraft' || lower === 'returned_draft') {
    return {
      kind: 'where' as const,
      where: {
        status: WorkItemStatus.DRAFT,
        OR: [
          { rejectReason: { not: null } },
          { rejectedFromStatus: { not: null } },
        ],
      },
    };
  }

  if (lower === 'pendingdecompose' || lower === 'pending_decompose') {
    return { kind: 'where' as const, where: { status: WorkItemStatus.PENDING_DECOMPOSE } };
  }

  const exact = Object.values(WorkItemStatus).find((value) => value === normalized.toUpperCase());
  if (exact) return { kind: 'where' as const, where: { status: exact } };

  if (lower === 'approving') {
    return { kind: 'where' as const, where: { status: { in: APPROVING_STATUSES } } };
  }

  if (lower === 'inprogress' || lower === 'in_progress') {
    return { kind: 'where' as const, where: { status: WorkItemStatus.IN_PROGRESS } };
  }

  if (lower === 'completed') {
    return { kind: 'where' as const, where: { status: WorkItemStatus.COMPLETED } };
  }

  if (lower === 'cancelled') {
    return { kind: 'where' as const, where: { status: WorkItemStatus.CANCELLED } };
  }

  if (lower === 'handling') {
    return {
      kind: 'post' as const,
      where: { status: { in: [WorkItemStatus.DRAFT, WorkItemStatus.PENDING_DECOMPOSE, WorkItemStatus.IN_PROGRESS] } },
      postFilter: 'handling' as const,
    };
  }

  if (lower === 'overdue' || lower === 'expiring') {
    return {
      kind: 'post' as const,
      where: { status: { notIn: TERMINAL_STATUSES } },
      postFilter: lower as 'overdue' | 'expiring',
    };
  }

  return { kind: 'invalid' as const };
}

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

    const filters: any[] = [buildWorkVisibilityWhere(currentUser)];

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
      filters.push({ type: workType });
    }

    const statusFilter = normalizeStatusQuery(status);
    if (statusFilter?.kind === 'invalid') {
      return NextResponse.json({ error: '无效的状态筛选' }, { status: 400 });
    }
    if (statusFilter?.kind === 'where' || statusFilter?.kind === 'post') {
      filters.push(statusFilter.where);
    }

    if (departmentId) {
      const id = Number(departmentId);
      filters.push({
        OR: [
          { departmentId: id },
          { responsibleDepartmentIds: { has: id } },
          { cooperateDepartmentIds: { has: id } },
        ],
      });
    }

    if (keyword) {
      filters.push({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { workItem: { contains: keyword, mode: 'insensitive' } },
          { businessCategory: { contains: keyword, mode: 'insensitive' } },
          { proposedScene: { contains: keyword, mode: 'insensitive' } },
          { progress: { contains: keyword, mode: 'insensitive' } },
          { workPlan: { contains: keyword, mode: 'insensitive' } },
        ],
      });
    }

    const where = filters.length > 1 ? { AND: filters } : filters[0];

    const works = await prisma.workItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: true,
        creator: { select: { name: true, role: true } },
        proposedLeader: { select: { id: true, name: true } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filteredWorks = statusFilter?.kind === 'post'
      ? works.filter((work) => {
        if (statusFilter.postFilter === 'handling') return canHandleWorkItem(currentUser, work);
        if (statusFilter.postFilter === 'overdue') return isOverdueWork(work, today);
        if (statusFilter.postFilter === 'expiring') return isExpiringWork(work, today);
        return true;
      })
      : works;

    const result = filteredWorks.map((work) => ({
      id: work.id,
      title: work.title,
      type: work.type === 'PRIORITY' ? '重点' : work.type === 'MAIN' ? '主要' : '待办',
      status: work.status,
      departmentId: work.departmentId,
      responsibleDepartmentIds: work.responsibleDepartmentIds as number[] || [],
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
      responsiblePerson: work.responsiblePerson,
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
      rejectReason: work.rejectReason,
      rejectedFromStatus: work.rejectedFromStatus,
      beforeApprovalStatus: work.beforeApprovalStatus,
      approvalType: work.approvalType,
      nodes: processNodesForDisplay(parseJsonField(work.nodes, [])),
      adjustHistory: processAdjustHistory(parseJsonField(work.adjustHistory, [])),
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
      responsibleLeader: rest.responsibleLeader,
      responsiblePerson: rest.responsiblePerson,
      // Phase 2: 部门领导/主管人员 ID 和 Name（校验后写入）
      // proposedLeaderId: 提出领导 ID（真实关联字段）
      proposedLeaderId: rest.proposedLeaderId,
      // approvalLeaderId: 审批领导 ID，默认等于 proposedLeaderId
      // 只有特殊情况才允许单独指定
      approvalLeaderId: rest.approvalLeaderId || rest.proposedLeaderId,
      proposedScene: rest.proposedScene,
      formedTime: convertToDateTime(rest.formedTime),
      responsibleDepartmentIds: rest.responsibleDepartmentIds || (departmentId ? [departmentId] : []),
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
      responsibleDepartmentIds: work.responsibleDepartmentIds as number[] || [],
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
