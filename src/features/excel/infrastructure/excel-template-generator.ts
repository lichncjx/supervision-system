import * as XLSX from 'xlsx'
import type { ExcelRouteType } from '@/lib/excel-utils'

export function getExcelTemplate(
  type: ExcelRouteType,
): { body: Uint8Array; fileName: string } {
  let headers: string[] = []
  let fileName = ''

  let example: string[] = []

  switch (type) {
    case 'priority':
      headers = [
        '业务类别',
        '工作事项',
        '是否为创新工作',
        '工作节点',
        '完成时间',
        '完成形式',
        '责任部门',
        '责任领导',
        '责任人',
      ]
      example = [
        '示例：生产管理',
        '示例：完成年度生产计划',
        '是',
        '示例：制定方案',
        '2026-12-31',
        '示例：书面报告',
        'JH',
        '张三',
        '李四',
      ]
      fileName = '重点工作导入模板.xlsx'
      break
    case 'main':
      headers = [
        '业务类别',
        '工作事项',
        '工作节点',
        '完成时间',
        '完成形式',
        '责任部门',
        '责任领导',
        '责任人',
      ]
      example = [
        '示例：生产管理',
        '示例：完成年度生产计划',
        '示例：制定方案',
        '2026-12-31',
        '示例：书面报告',
        'JH',
        '张三',
        '李四',
      ]
      fileName = '主要工作导入模板.xlsx'
      break
    case 'todo':
      headers = [
        '事项提出领导',
        '指定审批领导',
        '事项提出场景',
        '待办事项',
        '形成时间',
        '主责部门',
        '主责责任人',
        '配合部门',
        '配合责任人',
        '工作计划',
        '计划完成时间',
        '进展情况',
      ]
      example = [
        '公司主管领导',
        '公司主管领导',
        '示例：公司会议交办',
        '示例：完成信息系统升级',
        '2026-06-01',
        'XD/ZL',
        '张三/李四',
        'JH',
        '王五',
        '示例：第一阶段完成需求分析，第二阶段完成开发上线',
        '2026-12-31',
        '示例：已完成50%',
      ]
      fileName = '待办事项导入模板.xlsx'
      break
  }

  const rows = [headers]
  if (example.length > 0) {
    rows.push(example)
  }
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '模板')
  const body = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return { body, fileName }
}
