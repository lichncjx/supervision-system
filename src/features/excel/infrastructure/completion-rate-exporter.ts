import * as XLSX from 'xlsx'
import type { CompletionRateStat } from '@/shared/completion-rate.rules'

const HEADERS = [
  '序号',
  '部门',
  '重点工作总数',
  '重点工作已完成',
  '重点工作完成率',
  '主要工作总数',
  '主要工作已完成',
  '主要工作完成率',
  '待办事项总数',
  '待办已完成',
  '待办完成率',
  '总事项数',
  '总完成数',
  '总完成率',
  '超期数',
  '取消数',
]

export function generateCompletionRateBuffer(
  stats: CompletionRateStat[],
): { buffer: Buffer; fileName: string } {
  const today = new Date().toISOString().split('T')[0]
  const fileName = `完成率统计_${today}.xlsx`

  const rows = stats.map((stat, index) => [
    index + 1,
    stat.departmentName,
    stat.priorityTotal,
    stat.priorityCompleted,
    stat.priorityRate + '%',
    stat.mainTotal,
    stat.mainCompleted,
    stat.mainRate + '%',
    stat.todoTotal,
    stat.todoCompleted,
    stat.todoRate + '%',
    stat.total,
    stat.completed,
    stat.completionRate + '%',
    stat.overdue,
    stat.cancelled,
  ])

  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '完成率统计')
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

  return { buffer, fileName }
}
