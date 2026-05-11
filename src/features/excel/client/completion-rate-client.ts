import * as XLSX from 'xlsx'
import type { Work } from '@/lib/work-store'
import { getDepartmentsForExcel } from './excel-api'

export async function exportCompanyCompletionRate(works: Work[]) {
  const departments = await getDepartmentsForExcel()

  const getDepartmentNameForExcel = (id?: number) => {
    if (!id) return ''
    return departments.find((d) => d.id === id)?.name || ''
  }

  const formatRate = (completed: number, total: number) => {
    if (total <= 0) return '0%'
    return `${((completed / total) * 100).toFixed(1)}%`
  }

  const isCompletedForRate = (work: Work) => {
    const status = String(work.status || '').trim()
    return status === 'completed' || status === '已完成'
  }

  const isCancelledForRate = (work: Work) => {
    const status = String(work.status || '').trim()
    return status === 'cancelled' || status === 'canceled' || status === '已取消'
  }

  const getResponsibleDepartmentIds = (work: Work) => {
    const ids = new Set<number>()
    const addId = (value: any) => {
      const id = Number(value)
      if (Number.isFinite(id) && id > 0 && id !== 1) {
        ids.add(id)
      }
    }
    addId(work.departmentId)
    return Array.from(ids)
  }

  const calculateRate = (list: Work[]) => {
    const valid = list.filter((w) => !isCancelledForRate(w))
    const completed = valid.filter((w) => isCompletedForRate(w)).length
    return {
      completed,
      total: valid.length,
      rate: formatRate(completed, valid.length),
    }
  }

  const responsibleDepartmentIds = departments
    .filter((d) => d.id !== 1)
    .map((d) => d.id)

  const headers = [
    '部门',
    '重点工作完成率',
    '主要工作完成率',
    '待办事项完成率',
    '总完成率',
  ]

  const rows = responsibleDepartmentIds.map((departmentId) => {
    const deptWorks = works.filter((work) =>
      getResponsibleDepartmentIds(work).includes(departmentId),
    )

    const priority = calculateRate(
      deptWorks.filter((w) => w.type === '重点'),
    )
    const main = calculateRate(deptWorks.filter((w) => w.type === '主要'))
    const todo = calculateRate(deptWorks.filter((w) => w.type === '待办'))
    const total = calculateRate(deptWorks)

    return [
      getDepartmentNameForExcel(departmentId),
      priority.rate,
      main.rate,
      todo.rate,
      total.rate,
    ]
  })

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '公司完成率')
  XLSX.writeFile(workbook, '公司完成率.xlsx')
}
