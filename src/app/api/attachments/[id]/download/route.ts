import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import {
  canViewAttachment,
  type AttPermWorkItem,
} from '@/lib/attachment-permissions';
import { existsSync, promises as fs } from 'fs';
import path from 'path';

export async function GET(
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
          select: {
            departmentId: true,
            departmentIds: true,
            cooperateDepartmentIds: true,
            creatorId: true,
            proposedLeaderId: true,
            approvalLeaderId: true,
            currentApproverId: true,
            currentApproverRole: true,
            needMainLeaderCancel: true,
            type: true,
            deptManagerId: true,
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: '附件不存在' }, { status: 404 });
    }

    if (attachment.workItem) {
      const permWorkItem: AttPermWorkItem = {
        departmentId: attachment.workItem.departmentId,
        departmentIds: attachment.workItem.departmentIds,
        cooperateDepartmentIds: attachment.workItem.cooperateDepartmentIds,
        status: '', // download 不校验状态
        creatorId: attachment.workItem.creatorId,
        proposedLeaderId: attachment.workItem.proposedLeaderId,
        approvalLeaderId: attachment.workItem.approvalLeaderId,
        currentApproverId: attachment.workItem.currentApproverId,
        currentApproverRole: attachment.workItem.currentApproverRole,
        needMainLeaderCancel: attachment.workItem.needMainLeaderCancel,
        type: attachment.workItem.type,
        deptManagerId: attachment.workItem.deptManagerId,
      };
      if (!canViewAttachment(currentUser, permWorkItem)) {
        return NextResponse.json({ error: '无权查看该附件' }, { status: 403 });
      }
    }

    const filePath = path.join(process.cwd(), attachment.filePath);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);

    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.7z': 'application/x-7z-compressed',
    };

    const contentType = contentTypes[attachment.fileType] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: '下载失败' }, { status: 500 });
  }
}
