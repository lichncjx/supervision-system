import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';

const ACTION_MAP: Record<string, string> = {
  create: '新增',
  update: '修改',
  delete: '删除',
  import: '导入',
  export: '导出',
  upload: '上传',
  download: '下载',
  approve: '审批通过',
  reject: '审批退回',
  login: '登录',
  logout: '退出',
  evidence: '提交见证材料',
  adjust: '申请调整',
  cancel: '申请取消',
  decompose: '分解待办',
};

const MODULE_MAP: Record<string, string> = {
  works: '事项',
  workflow: '审批流',
  excel: 'Excel',
  attachment: '附件',
  user: '用户',
  auth: '认证',
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const currentUser = await getUserFromToken(token);
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERVISOR') {
      return NextResponse.json({ error: '无权查看操作日志' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const action = searchParams.get('action');
    const moduleFilter = searchParams.get('module');
    const userId = searchParams.get('userId');
    const targetType = searchParams.get('targetType');
    const targetId = searchParams.get('targetId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const keyword = searchParams.get('keyword');

    const whereClause: any = {};

    if (action) {
      whereClause.action = action;
    }

    if (moduleFilter) {
      whereClause.module = moduleFilter;
    }

    if (userId) {
      whereClause.userId = parseInt(userId);
    }

    if (targetType) {
      whereClause.targetType = targetType;
    }

    if (targetId) {
      whereClause.targetId = parseInt(targetId);
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    if (keyword) {
      whereClause.OR = [
        { description: { contains: keyword } },
        { userName: { contains: keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.operationLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.operationLog.count({ where: whereClause }),
    ]);

    const result = items.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.userName,
      userRole: log.userRole,
      action: log.action,
      actionText: ACTION_MAP[log.action] || log.action,
      module: log.module,
      moduleText: MODULE_MAP[log.module] || log.module,
      targetId: log.targetId,
      targetType: log.targetType,
      description: log.description,
      ipAddress: log.ipAddress || null,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get operation logs error:', error);
    return NextResponse.json({ error: '获取操作日志失败' }, { status: 500 });
  }
}