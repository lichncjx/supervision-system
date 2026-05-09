import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { WorkItemStatus, WorkItemType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getUserFromToken } from '@/lib/server-auth'
import {
  buildWorkVisibilityWhere,
  canViewWorkItem,
  getCooperateDepartmentIds,
  getResponsibleDepartmentIds,
} from '@/lib/server-permissions'
import { getWorkStatusLabel } from '@/lib/work-status'

function getTypeText(type: WorkItemType): string {
  if (type === WorkItemType.PRIORITY) return '重点工作'
  if (type === WorkItemType.MAIN) return '主要工作'
  return '待办事项'
}

function normalizeTypeFilter(type: string | null): WorkItemType | null {
  if (!type) return null
  const normalized = type.toUpperCase()
  if (normalized === WorkItemType.PRIORITY) return WorkItemType.PRIORITY
  if (normalized === WorkItemType.MAIN) return WorkItemType.MAIN
  if (normalized === WorkItemType.TODO) return WorkItemType.TODO
  return null
}

function normalizeStatusFilter(status: string | null): WorkItemStatus | null {
  if (!status) return null
  const normalized = status.toUpperCase()
  return Object.values(WorkItemStatus).includes(normalized as WorkItemStatus)
    ? normalized as WorkItemStatus
    : null
}

function formatDate(value: Date | null): string {
  return value ? value.toISOString().split('T')[0] : ''
}

function joinNames(values: string[] | null | undefined): string {
  return Array.isArray(values) ? values.filter(Boolean).join('/') : ''
}

function buildDepartmentCodeMap(departments: { id: number; code: string | null; name: string }[]) {
  return new Map(departments.map((department) => [
    department.id,
    department.code || department.name || String(department.id),
  ]))
}

function departmentCodes(ids: number[], deptById: Map<number, string>): string {
  return ids.map((id) => deptById.get(id) || String(id)).join('/')
}

function keywordMatches(workItem: {
  title: string
  workItem: string | null
  businessCategory: string | null
}, keyword: string | null): boolean {
  if (!keyword) return true
  return [workItem.title, workItem.workItem, workItem.businessCategory]
    .filter(Boolean)
    .some((value) => String(value).includes(keyword))
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const currentUser = await getUserFromToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const typeFilter = normalizeTypeFilter(searchParams.get('type'))
    const rawTypeFilter = searchParams.get('type')
    const statusFilter = normalizeStatusFilter(searchParams.get('status'))
    const departmentIdFilter = searchParams.get('departmentId')
      ? Number(searchParams.get('departmentId'))
      : null
    const keyword = searchParams.get('keyword')?.trim() || null

    if (rawTypeFilter && !typeFilter) {
      return NextResponse.json({ error: '无效的事项类型' }, { status: 400 })
    }

    const workItems = await prisma.workItem.findMany({
      where: buildWorkVisibilityWhere(currentUser),
      include: {
        department: { select: { id: true, name: true, code: true } },
        creator: { select: { name: true } },
        proposedLeader: { select: { name: true } },
        approvalLeader: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const visibleItems = workItems
      .filter((workItem) => canViewWorkItem(currentUser, workItem))
      .filter((workItem) => !typeFilter || workItem.type === typeFilter)
      .filter((workItem) => !statusFilter || workItem.status === statusFilter)
      .filter((workItem) => keywordMatches(workItem, keyword))
      .filter((workItem) => {
        if (!departmentIdFilter) return true
        return (
          getResponsibleDepartmentIds(workItem).includes(departmentIdFilter) ||
          getCooperateDepartmentIds(workItem).includes(departmentIdFilter)
        )
      })

    const departments = await prisma.department.findMany({
      select: { id: true, name: true, code: true },
    })
    const deptById = buildDepartmentCodeMap(departments)

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
      '主责部门',
      '业务责任领导',
      '业务责任人',
      '配合部门',
      '配合责任人',
      '进展情况',
      '创建人',
      '创建时间',
      '更新时间',
      '取消原因',
      '退回原因',
      '事项提出领导',
      '指定审批领导',
    ]

    const rows = visibleItems.map((item, index) => {
      const isPriorityOrMain = item.type === WorkItemType.PRIORITY || item.type === WorkItemType.MAIN
      const responsibleDepartmentCodes = departmentCodes(getResponsibleDepartmentIds(item), deptById)
      const cooperateDepartmentCodes = departmentCodes(getCooperateDepartmentIds(item), deptById)

      return [
        index + 1,
        getTypeText(item.type),
        getWorkStatusLabel(item.status),
        item.businessCategory || '',
        item.workItem || item.title || '',
        isPriorityOrMain ? (item.isInnovation ? '是' : '否') : '',
        isPriorityOrMain ? (item.workNode || '') : '',
        formatDate(item.completeTime),
        isPriorityOrMain ? (item.completeForm || '') : '',
        responsibleDepartmentCodes,
        isPriorityOrMain ? (item.responsibleLeader || item.deptLeaderName || '') : '',
        isPriorityOrMain ? (item.supervisor || item.deptManagerName || '') : joinNames(item.responsiblePersons),
        item.type === WorkItemType.TODO ? cooperateDepartmentCodes : '',
        item.type === WorkItemType.TODO ? joinNames(item.cooperatePersons) : '',
        item.type === WorkItemType.TODO ? (item.progress || '') : '',
        item.creator?.name || '',
        formatDate(item.createdAt),
        formatDate(item.updatedAt),
        item.cancelReason || '',
        item.rejectReason || '',
        item.type === WorkItemType.TODO ? (item.proposedLeader?.name || item.proposedLeaderId || '') : '',
        item.type === WorkItemType.TODO ? (item.approvalLeader?.name || item.approvalLeaderId || '') : '',
      ]
    })

    const today = new Date().toISOString().split('T')[0]
    const fileName = typeFilter
      ? `${getTypeText(typeFilter)}事项导出_${today}.xlsx`
      : `督办事项导出_${today}.xlsx`

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '数据')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    prisma.operationLog.create({
      data: {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'export',
        module: 'excel',
        targetType: 'workItem',
        targetId: 0,
        description: `导出事项数据，共 ${visibleItems.length} 条`,
      },
    }).catch((logError) => {
      console.error('Failed to write operation log:', logError)
    })

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    console.error('Export error:', message)
    return NextResponse.json({ error: `导出失败: ${message}` }, { status: 500 })
  }
}
