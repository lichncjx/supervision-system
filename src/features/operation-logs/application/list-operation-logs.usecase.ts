import type { BaseCurrentUser } from '@/shared/auth/current-user'
import type { Page } from '@/shared/page'
import { type Result, ok, err } from '@/shared/result'
import {
  findOperationLogs,
  type OperationLogListQuery,
} from '@/features/operation-logs/infrastructure/operation-log.repository'

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
  reconcile: '存储对账',
}

export interface OperationLogDto {
  id: number
  userId: number
  userName: string
  userRole: string
  action: string
  actionText: string
  module: string
  moduleText: string
  targetId: number | null
  targetType: string | null
  description: string
  ipAddress: string | null
  createdAt: string
}

const MODULE_MAP: Record<string, string> = {
  works: '事项',
  workflow: '审批流',
  excel: 'Excel',
  attachment: '附件',
  user: '用户',
  auth: '认证',
}


function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseOptionalPositiveInt(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function parseStartDate(value: string | null): Date | undefined {
  if (!value) return undefined
  const start = new Date(value)
  return Number.isNaN(start.getTime()) ? undefined : start
}

function parseEndDate(value: string | null): Date | undefined {
  if (!value) return undefined
  const end = new Date(value)
  if (Number.isNaN(end.getTime())) return undefined
  end.setHours(23, 59, 59, 999)
  return end
}

export function parseOperationLogQuery(
  searchParams: URLSearchParams,
): OperationLogListQuery {
  const page = Math.max(1, parsePositiveInt(searchParams.get('page'), 1))
  const pageSize = Math.min(
    100,
    Math.max(1, parsePositiveInt(searchParams.get('pageSize'), 20)),
  )

  return {
    page,
    pageSize,
    action: searchParams.get('action') || undefined,
    module: searchParams.get('module') || undefined,
    userId: parseOptionalPositiveInt(searchParams.get('userId')),
    targetType: searchParams.get('targetType') || undefined,
    targetId: parseOptionalPositiveInt(searchParams.get('targetId')),
    startDate: parseStartDate(searchParams.get('startDate')),
    endDate: parseEndDate(searchParams.get('endDate')),
    keyword: searchParams.get('keyword')?.trim() || undefined,
  }
}

function toOperationLogDto(log: {
  id: number
  userId: number
  userName: string
  userRole: string
  action: string
  module: string
  targetId: number | null
  targetType: string | null
  description: string
  ipAddress: string | null
  createdAt: Date
}): OperationLogDto {
  return {
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
  }
}

export async function listOperationLogsUseCase(
  currentUser: BaseCurrentUser,
  query: OperationLogListQuery,
): Promise<Result<Page<OperationLogDto>>> {
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERVISOR') {
    return err(403, '无权查看操作日志')
  }

  const { items, total } = await findOperationLogs(query)

  return ok({
    items: items.map(toOperationLogDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  })
}
