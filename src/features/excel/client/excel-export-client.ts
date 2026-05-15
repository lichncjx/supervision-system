import * as XLSX from 'xlsx'
import type { Work } from '@/lib/work-store'
import type { ExcelRouteType } from '@/features/excel/domain/excel.types'
import { getDepartmentNameForExcel } from './excel-api'

export async function exportWorksToExcel(
  type: ExcelRouteType,
  works: Work[],
) {
  let headers: string[] = []
  let rows: any[] = []
  let fileName = ''

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
      rows = await Promise.all(
        works.map(async (work) => [
          work.businessCategory || '',
          work.workItem || '',
          work.isInnovation ? '是' : '否',
          work.workNode || '',
          work.planCompleteTime || '',
          work.completeForm || '',
          await getDepartmentNameForExcel(work.departmentId),
          work.responsibleLeader || '',
          work.responsiblePerson || '',
        ]),
      )
      fileName = '重点工作导出.xlsx'
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
      rows = await Promise.all(
        works.map(async (work) => [
          work.businessCategory || '',
          work.workItem || '',
          work.workNode || '',
          work.planCompleteTime || '',
          work.completeForm || '',
          await getDepartmentNameForExcel(work.departmentId),
          work.responsibleLeader || '',
          work.responsiblePerson || '',
        ]),
      )
      fileName = '主要工作导出.xlsx'
      break
    case 'todo':
      headers = [
        '事项提出领导',
        '事项提出场景',
        '待办事项',
        '形成时间',
        '主责部门',
        '主责责任人',
        '配合部门',
        '配合责任人',
        '工作计划',
        '完成时间',
        '进展情况',
      ]
      rows = await Promise.all(
        works.map(async (work) => [
          work.proposedLeader || '',
          work.proposedScene || '',
          work.workItem || '',
          work.formedTime || '',
          await getDepartmentNameForExcel(work.departmentId),
          work.responsiblePerson || '',
          (work.cooperators || [])
            .map((c: any) => c.departmentName || '')
            .filter(Boolean)
            .join('/'),
          (work.cooperators || [])
            .map((c: any) => c.person || '')
            .filter(Boolean)
            .join('/'),
          work.workPlan || '',
          work.planCompleteTime || '',
          work.progress || '',
        ]),
      )
      fileName = '待办事项导出.xlsx'
      break
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '数据')
  XLSX.writeFile(workbook, fileName)
}
