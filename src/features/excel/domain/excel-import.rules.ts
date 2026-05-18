import type { BaseCurrentUser } from '@/shared/auth/current-user'
import * as XLSX from 'xlsx'
import { Role, WorkItemStatus } from '@prisma/client'
import { isGlobalView } from '@/features/users/domain/role.rules'

export interface ImportRow {
  row: number
  data: any
}

export interface ValidationError {
  row: number
  field: string
  value: string
  reason: string
}

export function isDepartmentImportRole(role: string): boolean {
  return role === Role.DEPARTMENT_LEADER || role === Role.DEPARTMENT_MANAGER
}

function getImportResponsibleDepartmentIds(data: any): number[] {
  return data.departmentId ? [data.departmentId] : []
}

export function validateImportScope(
  currentUser: BaseCurrentUser,
  row: ImportRow,
): ValidationError | null {
  const responsibleDepartmentIds =
    getImportResponsibleDepartmentIds(row.data)

  if (isGlobalView(currentUser.role)) {
    return null
  }

  if (isDepartmentImportRole(currentUser.role)) {
    if (!responsibleDepartmentIds.includes(currentUser.departmentId)) {
      return {
        row: row.row,
        field: '主责部门',
        value:
          row.data.departmentName ||
          row.data.departmentNames?.join('/') ||
          '',
        reason:
          '部门用户只能导入主责部门包含本部门的事项；配合部门不能替代主责部门授权',
      }
    }
    return null
  }

  if (
    currentUser.role === Role.VICE_PRESIDENT ||
    currentUser.role === Role.PRESIDENT
  ) {
    if (row.data.type !== 'TODO') {
      return {
        row: row.row,
        field: '事项类型',
        value: row.data.type,
        reason: '公司领导普通导入仅允许导入本人提出或本人审批的待办事项',
      }
    }

    const leaderIds = [
      row.data.proposedLeaderId,
      row.data.approvalLeaderId,
    ].filter(Boolean)
    if (!leaderIds.includes(currentUser.id)) {
      return {
        row: row.row,
        field: '事项提出领导/指定审批领导',
        value: `${row.data.proposedLeaderName || ''}/${row.data.approvalLeaderName || ''}`,
        reason: '公司领导不能默认全局导入其他领导负责的事项',
      }
    }
    return null
  }

  return {
    row: row.row,
    field: '权限',
    value: currentUser.role,
    reason: '当前角色无普通 Excel 导入权限',
  }
}

export function parseExcelDate(value: any): string | null {
  if (!value) return null

  if (typeof value === 'number' && value > 25000 && value < 60000) {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, year, month, day] = match
      const d = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
      )
      if (!isNaN(d.getTime())) {
        return `${year}-${month}-${day}`
      }
    }
  }

  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString().split('T')[0]
    }
  }

  return null
}

export function isAllowedImportedStatus(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) return true
  return (
    normalized === '草稿' ||
    normalized.toUpperCase() === WorkItemStatus.DRAFT
  )
}
