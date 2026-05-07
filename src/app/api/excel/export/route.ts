import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { getUserFromToken } from '@/lib/server-auth';
import { WorkItemStatus } from '@prisma/client';

function isCompanyLevelRole(role: string): boolean {
  const companyRoles: string[] = ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'];
  return companyRoles.includes(role);
}

function getStatusText(status: WorkItemStatus): string {
  const statusMap: Record<WorkItemStatus, string> = {
    DRAFT: '草稿',
    PENDING_DECOMPOSE: '待分解',
    PENDING_DEPT: '待部门审批',
    PENDING_COMPANY: '待公司审批',
    PENDING_COMPLETE: '待完成',
    APPROVED: '已审批',
    IN_PROGRESS: '进行中',
    PENDING_EVIDENCE_DEPT: '待部门见证材料',
    PENDING_EVIDENCE_COMPANY: '待公司见证材料',
    ADJUSTING: '调整中',
    CANCELLING: '取消中',
    PENDING_MAIN_LEADER_CANCEL: '待主要领导取消审批',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
    REJECTED: '已退回',
  };
  return statusMap[status] || String(status);
}

function getTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    PRIORITY: '重点工作',
    MAIN: '主要工作',
    TODO: '待办事项',
  };
  return typeMap[type] || type;
}

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

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const departmentIdFilter = searchParams.get('departmentId');
    const statusFilter = searchParams.get('status');
    const keyword = searchParams.get('keyword');

    const whereClause: any = {};

    if (typeFilter && ['PRIORITY', 'MAIN', 'TODO', 'priority', 'main', 'todo'].includes(typeFilter)) {
      const normalizedType = typeFilter.toUpperCase();
      whereClause.type = normalizedType;
    }

    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    if (keyword) {
      whereClause.OR = [
        { title: { contains: keyword } },
        { workItem: { contains: keyword } },
        { businessCategory: { contains: keyword } },
      ];
    }

    if (!isCompanyLevelRole(currentUser.role)) {
      whereClause.departmentId = currentUser.departmentId;
    } else if (departmentIdFilter) {
      whereClause.departmentId = parseInt(departmentIdFilter);
    }

    const workItems = await prisma.workItem.findMany({
      where: whereClause,
      include: {
        department: {
          select: { name: true },
        },
        creator: {
          select: { name: true },
        },
        proposedLeader: {
          select: { name: true },
        },
        approvalLeader: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const departments = await prisma.department.findMany({
      select: { id: true, code: true },
    });
    const deptIdToCode = new Map(departments.filter((d) => d.code).map((d) => [d.id, d.code!]));
    const deptCodes = (ids: number[]) =>
      ids.map((id) => deptIdToCode.get(id) || String(id)).join('/');

    const today = new Date().toISOString().split('T')[0];
    let fileName = `督办事项导出_${today}.xlsx`;
    const headers = [
      '序号',
      '事项类型',
      '当前状态',
      '业务类别',
      '工作事项',
      '是否为创新工作',
      '工作节点',
      '完成时间',
      '完成形式',
      // 责任部门：重点/主要=单一部门，待办=主责部门（多选）
      '责任部门',
      // 责任领导：部门领导姓名快照（重点/主要专用，未来迁移为 deptLeaderName）
      '责任领导',
      // 主管人员：业务主管人员姓名快照（重点/主要专用，未来迁移为 deptManagerName，非系统角色督办管理员）
      '主管人员',
      '配合部门',
      '配合责任人',
      '进展情况',
      '创建人',
      '创建时间',
      '更新时间',
      '取消原因',
      '退回原因',
      // 事项提出领导：提出待办的公司领导姓名
      '事项提出领导',
      // 指定审批领导：负责审批的公司领导姓名（默认等于提出领导）
      '指定审批领导',
    ];

    const rows = workItems.map((item, index) => {
      const isPriorityOrMain = item.type === 'PRIORITY' || item.type === 'MAIN';

      return [
        index + 1,
        getTypeText(item.type),
        getStatusText(item.status),
        item.businessCategory || '',
        item.workItem || item.title || '',
        isPriorityOrMain ? (item.isInnovation ? '是' : '否') : '',
        isPriorityOrMain ? (item.workNode || '') : '',
        item.completeTime ? new Date(item.completeTime).toISOString().split('T')[0] : '',
        isPriorityOrMain ? (item.completeForm || '') : '',
        isPriorityOrMain
          ? (item.departmentId ? (deptIdToCode.get(item.departmentId) || String(item.departmentId)) : '')
          : (Array.isArray(item.departmentIds) ? deptCodes(item.departmentIds) : ''),
        isPriorityOrMain ? (item.deptLeaderName || item.responsibleLeader || '') : '',   // 快照优先，旧字段兜底
        isPriorityOrMain ? (item.deptManagerName || item.supervisor || '') : '',         // 快照优先，旧字段兜底
        item.type === 'TODO' ? deptCodes(item.cooperateDepartmentIds || []) : '',
        item.type === 'TODO' ? ((item.cooperatePersons || []).join('、')) : '',
        item.type === 'TODO' ? (item.progress || '') : '',
        item.creator?.name || '',
        new Date(item.createdAt).toISOString().split('T')[0],
        new Date(item.updatedAt).toISOString().split('T')[0],
        item.cancelReason || '',
        item.rejectReason || '',
        item.type === 'TODO' ? (item.proposedLeader?.name || item.proposedLeaderId || '') : '',
        item.type === 'TODO' ? (item.approvalLeader?.name || item.approvalLeaderId || '') : '',
      ];
    });

    if (typeFilter) {
      const normalizedType = typeFilter.toLowerCase();
      if (normalizedType === 'priority') {
        fileName = `重点工作事项导出_${today}.xlsx`;
      } else if (normalizedType === 'main') {
        fileName = `主要工作事项导出_${today}.xlsx`;
      } else if (normalizedType === 'todo') {
        fileName = `待办事项导出_${today}.xlsx`;
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '数据');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    await prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'export',
        module: 'excel',
        targetType: 'workItem',
        targetId: 0,
        description: `导出事项数据，共 ${workItems.length} 条`,
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}