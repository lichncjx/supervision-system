import * as XLSX from 'xlsx'
import { WorkItemType } from '@prisma/client'
import { getWorkStatusLabel } from '@/lib/work-status'
import type { ExportWorkRow } from './excel-work.repository'

function getTypeText(type: WorkItemType): string {
  if (type === WorkItemType.PRIORITY) return '重点工作'
  if (type === WorkItemType.MAIN) return '主要工作'
  return '待办事项'
}

function formatDate(value: Date | null): string {
  return value ? value.toISOString().split('T')[0] : ''
}

function joinCooperators(cooperators: unknown): string {
  if (!Array.isArray(cooperators)) return ''
  return (cooperators as any[])
    .map((c: any) => {
      const parts = [
        c?.departmentName || c?.departmentId || '',
        c?.leader || '',
        c?.person || '',
      ]
      return parts.join('|')
    })
    .filter((s) => s !== '||')
    .join('；')
}

const HEADERS = [
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
  '责任领导',
  '责任人',
  '配合方',
  '进展情况',
  '创建人',
  '创建时间',
  '更新时间',
  '取消原因',
  '退回原因',
  '事项提出领导',
  '指定审批领导',
]

function buildRow(item: ExportWorkRow, index: number) {
  const isPriorityOrMain =
    item.type === WorkItemType.PRIORITY || item.type === WorkItemType.MAIN
  const deptName = item.department?.name || item.department?.code || ''

  return [
    index + 1,
    getTypeText(item.type),
    getWorkStatusLabel(item.status),
    item.businessCategory || '',
    item.workItem || item.title || '',
    isPriorityOrMain ? (item.isInnovation ? '是' : '否') : '',
    isPriorityOrMain ? item.workNode || '' : '',
    formatDate(item.completeTime),
    isPriorityOrMain ? item.completeForm || '' : '',
    deptName,
    item.responsibleLeader || '',
    item.responsiblePerson || '',
    joinCooperators(item.cooperators),
    item.type === WorkItemType.TODO ? item.progress || '' : '',
    item.creator?.name || '',
    formatDate(item.createdAt),
    formatDate(item.updatedAt),
    item.cancelReason || '',
    item.rejectReason || '',
    item.type === WorkItemType.TODO
      ? item.proposedLeader?.name || item.proposedLeaderId || ''
      : '',
    item.type === WorkItemType.TODO
      ? item.approvalLeader?.name || item.approvalLeaderId || ''
      : '',
  ]
}

export function generateExportBuffer(
  items: ExportWorkRow[],
): { buffer: Buffer; fileName: string } {
  const today = new Date().toISOString().split('T')[0]

  const uniqueTypes = new Set(items.map((item) => item.type))
  let fileName: string
  if (uniqueTypes.size === 1) {
    const typeText = getTypeText([...uniqueTypes][0])
    fileName = `${typeText}事项导出_${today}.xlsx`
  } else {
    fileName = `督办事项导出_${today}.xlsx`
  }

  const rows = items.map((item, index) => buildRow(item, index))

  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '数据')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

  return { buffer, fileName }
}
