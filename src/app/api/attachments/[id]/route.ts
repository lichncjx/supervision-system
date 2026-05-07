import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import {
  canDeleteAttachment,
  type AttPermWorkItem,
  type AttPermAttachment,
} from '@/lib/attachment-permissions';
import { existsSync } from 'fs';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const { id } = await params;
    const attachmentId = parseInt(id);

    if (isNaN(attachmentId)) {
      return NextResponse.json({ error: '无效的附件ID' }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        workItem: {
          select: { departmentId: true, status: true, creatorId: true, type: true, deptManagerId: true },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 });
    }

    let canDelete = false;

    if (attachment.workItem) {
      const permWorkItem: AttPermWorkItem = {
        departmentId: attachment.workItem.departmentId,
        status: attachment.workItem.status,
        creatorId: attachment.workItem.creatorId,
        type: attachment.workItem.type,
        deptManagerId: attachment.workItem.deptManagerId,
      };
      const permAttachment: AttPermAttachment = {
        userId: attachment.userId,
      };
      canDelete = canDeleteAttachment(currentUser, permWorkItem, permAttachment);
    } else {
      // 孤立附件（workItem 已删除）：仅 ADMIN 可删（保守策略）
      canDelete = currentUser.role === 'ADMIN';
    }

    if (!canDelete) {
      return NextResponse.json({ error: '无权删除该附件' }, { status: 403 });
    }

    await prisma.attachment.delete({
      where: { id: attachmentId },
    });

    const filePath = path.join(process.cwd(), attachment.filePath);
    if (existsSync(filePath)) {
      try {
        await import('fs/promises').then(fs => fs.unlink(filePath));
      } catch {
        console.warn('Failed to delete physical file:', filePath);
      }
    }

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'delete',
        module: 'attachment',
        targetType: 'attachment',
        targetId: attachmentId,
        description: `删除附件：${attachment.fileName}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}