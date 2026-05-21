import type { OperationLogFilters } from '@/features/operation-logs/infrastructure/operation-log.repository'
import { findOperationLogs } from '@/features/operation-logs/infrastructure/operation-log.repository'

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
}

const MODULE_MAP: Record<string, string> = {
  works: '事项',
  workflow: '审批流',
  excel: 'Excel',
  attachment: '附件',
  user: '用户',
  auth: '认证',
}

export interface OperationLogItem {
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

export interface OperationLogPage {
  items: OperationLogItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type QueryOperationLogsResult =
  | { kind: 'ok'; data: OperationLogPage }
  | { kind: 'error'; status: number; message: string }

export async function queryOperationLogsUseCase(
  currentUser: { role: string },
  rawParams: Record<string, string | null>,
): Promise<QueryOperationLogsResult> {
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERVISOR') {
    return { kind: 'error', status: 403, message: '无权查看操作日志' }
  }

  const page = Math.max(1, parseInt(rawParams.page || '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(rawParams.pageSize || '20')))

  const filters: OperationLogFilters = {}
  if (rawParams.action) filters.action = rawParams.action
  if (rawParams.module) filters.module = rawParams.module
  if (rawParams.userId) filters.userId = parseInt(rawParams.userId)
  if (rawParams.targetType) filters.targetType = rawParams.targetType
  if (rawParams.targetId) filters.targetId = parseInt(rawParams.targetId)
  if (rawParams.startDate) filters.startDate = rawParams.startDate
  if (rawParams.endDate) filters.endDate = rawParams.endDate
  if (rawParams.keyword) filters.keyword = rawParams.keyword

  const { items, total } = await findOperationLogs(
    filters,
    (page - 1) * pageSize,
    pageSize,
  )

  const mappedItems: OperationLogItem[] = items.map((log) => ({
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
  }))

  return {
    kind: 'ok',
    data: {
      items: mappedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}
