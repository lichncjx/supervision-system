import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/shared/db/prisma';
import { verifyToken } from '@/shared/auth/jwt';
import { submitProposal } from '@/features/workflow/application/submit-proposal.usecase';
import { approveWorkflowAction } from '@/features/workflow/application/approve-workflow-action.usecase';
import { rejectWorkflowAction } from '@/features/workflow/application/reject-workflow-action.usecase';
import { submitCompletion } from '@/features/workflow/application/submit-completion.usecase';
import { submitAdjustment } from '@/features/workflow/application/submit-adjustment.usecase';
import { submitCancellation } from '@/features/workflow/application/submit-cancellation.usecase';
import { decomposeTodoWork } from '@/features/workflow/application/decompose-todo-work.usecase';
import { getWorkflowRecords } from '@/features/workflow/application/get-workflow-records.usecase';
import type { UserSession } from '@/features/workflow/domain/workflow.types';
import { canViewWorkItem } from '@/features/works/domain/work.permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workItemId = parseInt(id);

    if (isNaN(workItemId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 });
    }

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

    const user: UserSession = {
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      departmentId: currentUser.departmentId,
    };

    const body = await request.json();
    const { action, comment, proof, adjustReason, cancelReason, rejectReason, nodes } = body;

    let result;

    switch (action) {
      case 'submit':
        result = await submitProposal(workItemId, user, comment);
        break;
      case 'approve':
        result = await approveWorkflowAction(workItemId, user, comment);
        break;
      case 'reject':
        if (!rejectReason) {
          return NextResponse.json({ error: '请提供退回原因' }, { status: 400 });
        }
        result = await rejectWorkflowAction(workItemId, user, rejectReason);
        break;
      case 'evidence':
      case 'complete':
        if (!proof) {
          return NextResponse.json({ error: '请提供见证材料说明' }, { status: 400 });
        }
        result = await submitCompletion(workItemId, user, proof, comment);
        break;
      case 'adjust':
        if (!adjustReason) {
          return NextResponse.json({ error: '请提供调整原因' }, { status: 400 });
        }
        result = await submitAdjustment(workItemId, user, adjustReason, comment);
        break;
      case 'cancel':
        if (!cancelReason) {
          return NextResponse.json({ error: '请提供取消原因' }, { status: 400 });
        }
        result = await submitCancellation(workItemId, user, cancelReason, comment);
        break;
      case 'decompose':
        if (!nodes || !Array.isArray(nodes)) {
          return NextResponse.json({ error: '请提供分解节点' }, { status: 400 });
        }
        result = await decomposeTodoWork(workItemId, user, nodes, comment);
        break;
      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, workItem: result.workItem });
  } catch (error) {
    console.error('Workflow error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workItemId = parseInt(id);

    if (isNaN(workItemId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 });
    }

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

    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!workItem) {
      return NextResponse.json({ error: '事项不存在' }, { status: 404 });
    }

    if (!canViewWorkItem(currentUser, workItem)) {
      return NextResponse.json({ error: '无权查看该事项审批记录' }, { status: 403 });
    }

    const records = await getWorkflowRecords(workItemId);

    return NextResponse.json(records);
  } catch (error) {
    console.error('Get workflow records error:', error);
    return NextResponse.json({ error: '获取审批记录失败' }, { status: 500 });
  }
}
