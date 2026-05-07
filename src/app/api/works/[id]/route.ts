import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/server-auth';
import { formatDate, processNodesForDisplay, processAdjustHistory, convertToDateTime } from '@/lib/utils';
import { Role } from '@prisma/client';

const ROLES_CAN_VIEW_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.VICE_PRESIDENT, Role.PRESIDENT];
const ROLES_CAN_EDIT_ALL: Role[] = [Role.ADMIN, Role.SUPERVISOR];
const ROLES_CAN_EDIT_DEPT: Role[] = [Role.DEPARTMENT_MANAGER, Role.DEPARTMENT_LEADER];
const ALLOWED_EDIT_STATUS: string[] = ['DRAFT', 'REJECTED'];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const workId = parseInt(id);
    if (isNaN(workId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 });
    }

    const work = await prisma.workItem.findUnique({
      where: { id: workId },
      include: {
        department: true,
        creator: { select: { name: true, role: true } },
        proposedLeader: { select: { id: true, name: true } },
        attachments: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!work) {
      return NextResponse.json({ error: '事项不存在' }, { status: 404 });
    }

    if (!ROLES_CAN_VIEW_ALL.includes(currentUser.role)) {
      if (work.departmentId !== currentUser.departmentId) {
        return NextResponse.json({ error: '无权限访问此事项' }, { status: 403 });
      }
    }



    const result = {
      id: work.id,
      title: work.title,
      type: work.type === 'PRIORITY' ? '重点' : work.type === 'MAIN' ? '主要' : '待办',
      status: work.status,
      departmentId: work.departmentId,
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
      approvalLeaderId: work.approvalLeaderId,
      currentApproverId: work.currentApproverId,
      currentApproverRole: work.currentApproverRole,
      firstSubmitterId: work.firstSubmitterId,
      nodes: work.nodes ? processNodesForDisplay(JSON.parse(String(work.nodes))) : [],
      adjustHistory: work.adjustHistory ? processAdjustHistory(work.adjustHistory as any[]) : [],
      attachments: work.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        fileType: a.fileType,
        uploadedAt: a.uploadedAt.toISOString(),
        userId: a.userId,
        userName: a.user.name,
      })),
      createdAt: work.createdAt.toISOString(),
      updatedAt: work.updatedAt.toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get work error:', error);
    return NextResponse.json({ error: '获取事项详情失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params;
    const workId = parseInt(id);
    if (isNaN(workId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 });
    }

    const work = await prisma.workItem.findUnique({
      where: { id: workId },
    });

    if (!work) {
      return NextResponse.json({ error: '事项不存在' }, { status: 404 });
    }

    if (!ALLOWED_EDIT_STATUS.includes(work.status)) {
      return NextResponse.json({ error: '只能修改草稿或已退回状态的事项' }, { status: 403 });
    }

    if (!ROLES_CAN_EDIT_ALL.includes(currentUser.role)) {
      if (ROLES_CAN_EDIT_DEPT.includes(currentUser.role)) {
        if (work.departmentId !== currentUser.departmentId) {
          return NextResponse.json({ error: '只能修改本部门事项' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: '权限不足' }, { status: 403 });
      }
    }

    const body = await request.json();

    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.workItem !== undefined) updateData.workItem = body.workItem;
    if (body.workNode !== undefined) updateData.workNode = body.workNode;
    if (body.businessCategory !== undefined) updateData.businessCategory = body.businessCategory;
    if (body.completeTime !== undefined) updateData.completeTime = convertToDateTime(body.completeTime);
    if (body.completeForm !== undefined) updateData.completeForm = body.completeForm;
    if (body.isInnovation !== undefined) updateData.isInnovation = body.isInnovation;
    if (body.responsibleLeader !== undefined) updateData.responsibleLeader = body.responsibleLeader;
    if (body.supervisor !== undefined) updateData.supervisor = body.supervisor;
    if (body.proposedLeaderId !== undefined) updateData.proposedLeaderId = body.proposedLeaderId || null;
    if (body.proposedScene !== undefined) updateData.proposedScene = body.proposedScene;
    if (body.formedTime !== undefined) updateData.formedTime = convertToDateTime(body.formedTime);
    if (body.responsiblePersons !== undefined) updateData.responsiblePersons = body.responsiblePersons;
    if (body.cooperateDepartmentIds !== undefined) updateData.cooperateDepartmentIds = body.cooperateDepartmentIds;
    if (body.cooperatePersons !== undefined) updateData.cooperatePersons = body.cooperatePersons;
    if (body.workPlan !== undefined) updateData.workPlan = body.workPlan;
    if (body.planCompleteTime !== undefined) updateData.planCompleteTime = convertToDateTime(body.planCompleteTime);
    if (body.progress !== undefined) updateData.progress = body.progress;
    if (body.approvalLeaderId !== undefined) updateData.approvalLeaderId = body.approvalLeaderId || null;
    if (body.nodes !== undefined) updateData.nodes = JSON.stringify(body.nodes);
    if (body.status !== undefined) updateData.status = body.status;
    if (body.rejectReason !== undefined) updateData.rejectReason = body.rejectReason;
    if (body.rejectedFromStatus !== undefined) updateData.rejectedFromStatus = body.rejectedFromStatus;

    const updatedWork = await prisma.workItem.update({
      where: { id: workId },
      data: updateData,
      include: { department: true },
    });

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        module: 'works',
        targetId: updatedWork.id,
        targetType: 'work_item',
        description: `修改${updatedWork.type === 'PRIORITY' ? '重点' : updatedWork.type === 'MAIN' ? '主要' : '待办'}工作：${updatedWork.title}`,
      },
    });

    const result = {
      id: updatedWork.id,
      title: updatedWork.title,
      type: updatedWork.type === 'PRIORITY' ? '重点' : updatedWork.type === 'MAIN' ? '主要' : '待办',
      departmentId: updatedWork.departmentId,
      departmentName: updatedWork.department?.name || '-',
      status: updatedWork.status,
      updatedAt: updatedWork.updatedAt.toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update work error:', error);
    return NextResponse.json({ error: '修改事项失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { id } = await params;
    const workId = parseInt(id);
    if (isNaN(workId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 });
    }

    const work = await prisma.workItem.findUnique({
      where: { id: workId },
    });

    if (!work) {
      return NextResponse.json({ error: '事项不存在' }, { status: 404 });
    }

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'delete',
        module: 'works',
        targetId: work.id,
        targetType: 'work_item',
        description: `删除${work.type === 'PRIORITY' ? '重点' : work.type === 'MAIN' ? '主要' : '待办'}工作：${work.title}`,
      },
    });

    await prisma.workItem.delete({
      where: { id: workId },
    });

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('Delete work error:', error);
    return NextResponse.json({ error: '删除事项失败' }, { status: 500 });
  }
}
