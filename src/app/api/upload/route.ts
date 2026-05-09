import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import {
  canViewAttachment,
  canUploadAttachment,
  type AttPermWorkItem,
} from '@/lib/attachment-permissions';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.jpg', '.jpeg', '.png', '.gif', '.zip', '.rar', '.7z'
];

const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.js', '.ps1', '.dll'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    const formData = await request.formData();
    const workItemIdStr = formData.get('workItemId');
    const file = formData.get('file') as File | null;
    const categoryRaw = (formData.get('category') as string) || 'general';

    if (!['general', 'evidence'].includes(categoryRaw)) {
      return NextResponse.json({ error: '无效的附件分类' }, { status: 400 });
    }

    if (!workItemIdStr) {
      return NextResponse.json({ error: '请提供事项ID' }, { status: 400 });
    }

    const workItemId = parseInt(workItemIdStr as string);
    if (isNaN(workItemId)) {
      return NextResponse.json({ error: '无效的事项ID' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();

    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: '不允许上传可执行文件' }, { status: 400 });
    }

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `不支持的文件类型，仅允许：${ALLOWED_EXTENSIONS.join('、')}` }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 });
    }

    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      select: {
        id: true,
        departmentId: true,
        departmentIds: true,
        cooperateDepartmentIds: true,
        status: true,
        creatorId: true,
        proposedLeaderId: true,
        approvalLeaderId: true,
        currentApproverId: true,
        currentApproverRole: true,
        needMainLeaderCancel: true,
        type: true,
        deptManagerId: true,
      },
    });

    if (!workItem) {
      return NextResponse.json({ error: '事项不存在' }, { status: 404 });
    }

    const permWorkItem: AttPermWorkItem = {
      departmentId: workItem.departmentId,
      departmentIds: workItem.departmentIds,
      cooperateDepartmentIds: workItem.cooperateDepartmentIds,
      status: workItem.status,
      creatorId: workItem.creatorId,
      proposedLeaderId: workItem.proposedLeaderId,
      approvalLeaderId: workItem.approvalLeaderId,
      currentApproverId: workItem.currentApproverId,
      currentApproverRole: workItem.currentApproverRole,
      needMainLeaderCancel: workItem.needMainLeaderCancel,
      type: workItem.type,
      deptManagerId: workItem.deptManagerId,
    };

    if (!canViewAttachment(currentUser, permWorkItem)) {
      return NextResponse.json({ error: '无权查看该事项' }, { status: 403 });
    }

    if (!canUploadAttachment(currentUser, permWorkItem)) {
      return NextResponse.json({ error: '无权上传该事项的附件' }, { status: 403 });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const uuid = randomUUID();

    const uploadDir = path.join(process.cwd(), 'uploads', 'attachments', String(year), month, uuid);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeFileName = file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
    const filePath = path.join(uploadDir, safeFileName);

    await writeFile(filePath, buffer);

    const relativePath = path.relative(process.cwd(), filePath);

    const attachment = await prisma.attachment.create({
      data: {
        workItemId: workItemId,
        userId: currentUser.id,
        fileName: file.name,
        filePath: relativePath,
        fileSize: file.size,
        fileType: ext,
        category: categoryRaw,
        uploadedAt: now,
      },
    });

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'upload',
        module: 'attachment',
        targetType: 'attachment',
        targetId: attachment.id,
        description: `上传附件：${file.name}`,
      },
    });

    return NextResponse.json({
      success: true,
      attachment: {
        id: attachment.id,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        fileType: attachment.fileType,
        category: attachment.category,
        uploadedAt: attachment.uploadedAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}
