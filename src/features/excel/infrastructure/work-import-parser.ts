import * as XLSX from 'xlsx'
import { parseExcelDate, isAllowedImportedStatus } from '@/features/excel/domain/excel-import.rules'
import type { ValidationError as ImportValidationError } from '@/features/excel/domain/excel-import.rules'
import type { ImportRow } from '@/features/excel/presentation/excel.dto'
import type { DepartmentInfo, CompanyLeaderInfo } from './work-import.repository'

export async function validateAndParseExcel(
  fileBuffer: Buffer,
  type: string,
  departments: DepartmentInfo[],
  companyLeaders: CompanyLeaderInfo[],
): Promise<{ rows: ImportRow[]; errors: ImportValidationError[] }> {
  const errors: ImportValidationError[] = []
  const rows: ImportRow[] = []

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

  if (!jsonData || jsonData.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      value: '',
      reason: 'Excel 文件为空或格式不正确',
    })
    return { rows, errors }
  }

  const headerRow = jsonData[0] as any
  const headerMap: Record<string, string> = {}

  for (const key of Object.keys(headerRow)) {
    headerMap[key.trim()] = key
  }

  const deptNameToId = new Map(
    departments.map((d) => [d.name, d.id]),
  )
  const deptCodeToId = new Map(
    departments
      .filter((d) => d.code)
      .map((d) => [d.code!, d.id]),
  )
  const resolveDeptId = (input: string) =>
    deptNameToId.get(input) ??
    deptCodeToId.get(input.toUpperCase()) ??
    null

  const leaderNameToId = new Map(
    companyLeaders.map((u) => [u.name, u.id]),
  )

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i] as any
    const rowNum = i + 2

    const getCell = (field: string): string => {
      const key = headerMap[field]
      if (!key) return ''
      const val = row[key]
      return val !== undefined && val !== null
        ? String(val).trim()
        : ''
    }

    const importedStatus =
      getCell('当前状态') ||
      getCell('状态') ||
      getCell('status') ||
      getCell('Status')
    if (!isAllowedImportedStatus(importedStatus)) {
      errors.push({
        row: rowNum,
        field: '当前状态',
        value: importedStatus,
        reason:
          '普通导入只允许空状态或 DRAFT/草稿；审批中、进行中、终态和旧状态必须通过 workflow 流转',
      })
    }

    if (type === 'priority' || type === 'PRIORITY') {
      const businessCategory = getCell('业务类别')
      const workItem = getCell('工作事项')
      const isInnovationStr = getCell('是否为创新工作')
      const workNode = getCell('工作节点')
      const completeTimeStr = getCell('完成时间')
      const completeForm = getCell('完成形式')
      const departmentName = getCell('责任部门')
      const responsibleLeader = getCell('责任领导')
      const responsiblePerson = getCell('责任人')
      const cooperatorsStr = getCell('配合方')

      if (!workItem) {
        errors.push({
          row: rowNum,
          field: '工作事项',
          value: workItem,
          reason: '必填字段不能为空',
        })
      }
      if (
        !isInnovationStr ||
        !['是', '否'].includes(isInnovationStr)
      ) {
        errors.push({
          row: rowNum,
          field: '是否为创新工作',
          value: isInnovationStr,
          reason: '只能填写"是"或"否"',
        })
      }
      if (!completeTimeStr || !parseExcelDate(completeTimeStr)) {
        errors.push({
          row: rowNum,
          field: '完成时间',
          value: completeTimeStr,
          reason: '必填字段，格式为 YYYY-MM-DD',
        })
      }
      const resolvedDeptId = departmentName
        ? resolveDeptId(departmentName)
        : null
      if (!departmentName) {
        errors.push({
          row: rowNum,
          field: '责任部门',
          value: departmentName,
          reason: '必填字段不能为空',
        })
      } else if (!resolvedDeptId) {
        errors.push({
          row: rowNum,
          field: '责任部门',
          value: departmentName,
          reason: `部门"${departmentName}"不存在或不是业务部门，请填写部门全名或缩写代码`,
        })
      }
      if (!responsibleLeader) {
        errors.push({
          row: rowNum,
          field: '责任领导',
          value: responsibleLeader,
          reason: '必填字段不能为空',
        })
      }

      const cooperators: Array<{
        departmentId: number
        departmentName?: string
        leader?: string
        person?: string
      }> = []
      if (cooperatorsStr) {
        const segments = cooperatorsStr
          .split(/[；;]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
        for (const seg of segments) {
          const parts = seg.split('|').map((s: string) => s.trim())
          const coopDeptName = parts[0] || ''
          const resolvedCoopDeptId = coopDeptName
            ? resolveDeptId(coopDeptName)
            : null
          if (coopDeptName && !resolvedCoopDeptId) {
            errors.push({
              row: rowNum,
              field: '配合方',
              value: seg,
              reason: `配合部门"${coopDeptName}"不存在或不是业务部门`,
            })
          } else if (resolvedCoopDeptId) {
            cooperators.push({
              departmentId: resolvedCoopDeptId,
              departmentName: coopDeptName || undefined,
              leader: parts[1] || undefined,
              person: parts[2] || undefined,
            })
          }
        }
      }

      if (errors.filter((e) => e.row === rowNum).length === 0) {
        rows.push({
          row: rowNum,
          data: {
            type: 'PRIORITY',
            businessCategory,
            workItem,
            isInnovation: isInnovationStr === '是',
            workNode,
            completeTime: parseExcelDate(completeTimeStr),
            completeForm,
            departmentName,
            departmentId: resolvedDeptId,
            departmentCode:
              departments.find((d) => d.id === resolvedDeptId)
                ?.code || departmentName,
            responsibleLeader,
            responsiblePerson: responsiblePerson || null,
            cooperators,
          },
        })
      }
    } else if (type === 'main' || type === 'MAIN') {
      const businessCategory = getCell('业务类别')
      const workItem = getCell('工作事项')
      const workNode = getCell('工作节点')
      const completeTimeStr = getCell('完成时间')
      const completeForm = getCell('完成形式')
      const departmentName = getCell('责任部门')
      const responsibleLeader = getCell('责任领导')
      const responsiblePerson = getCell('责任人')
      const cooperatorsStr = getCell('配合方')

      if (!workItem) {
        errors.push({
          row: rowNum,
          field: '工作事项',
          value: workItem,
          reason: '必填字段不能为空',
        })
      }
      if (!completeTimeStr || !parseExcelDate(completeTimeStr)) {
        errors.push({
          row: rowNum,
          field: '完成时间',
          value: completeTimeStr,
          reason: '必填字段，格式为 YYYY-MM-DD',
        })
      }
      const resolvedDeptId = departmentName
        ? resolveDeptId(departmentName)
        : null
      if (!departmentName) {
        errors.push({
          row: rowNum,
          field: '责任部门',
          value: departmentName,
          reason: '必填字段不能为空',
        })
      } else if (!resolvedDeptId) {
        errors.push({
          row: rowNum,
          field: '责任部门',
          value: departmentName,
          reason: `部门"${departmentName}"不存在或不是业务部门，请填写部门全名或缩写代码`,
        })
      }
      if (!responsibleLeader) {
        errors.push({
          row: rowNum,
          field: '责任领导',
          value: responsibleLeader,
          reason: '必填字段不能为空',
        })
      }

      const cooperators: Array<{
        departmentId: number
        departmentName?: string
        leader?: string
        person?: string
      }> = []
      if (cooperatorsStr) {
        const segments = cooperatorsStr
          .split(/[；;]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
        for (const seg of segments) {
          const parts = seg.split('|').map((s: string) => s.trim())
          const coopDeptName = parts[0] || ''
          const resolvedCoopDeptId = coopDeptName
            ? resolveDeptId(coopDeptName)
            : null
          if (coopDeptName && !resolvedCoopDeptId) {
            errors.push({
              row: rowNum,
              field: '配合方',
              value: seg,
              reason: `配合部门"${coopDeptName}"不存在或不是业务部门`,
            })
          } else if (resolvedCoopDeptId) {
            cooperators.push({
              departmentId: resolvedCoopDeptId,
              departmentName: coopDeptName || undefined,
              leader: parts[1] || undefined,
              person: parts[2] || undefined,
            })
          }
        }
      }

      if (errors.filter((e) => e.row === rowNum).length === 0) {
        rows.push({
          row: rowNum,
          data: {
            type: 'MAIN',
            businessCategory,
            workItem,
            workNode,
            completeTime: parseExcelDate(completeTimeStr),
            completeForm,
            departmentName,
            departmentId: resolvedDeptId,
            departmentCode:
              departments.find((d) => d.id === resolvedDeptId)
                ?.code || departmentName,
            responsibleLeader,
            responsiblePerson: responsiblePerson || null,
            cooperators,
          },
        })
      }
    } else if (type === 'todo' || type === 'TODO') {
      const proposedLeaderName = getCell('事项提出领导')
      const approvalLeaderName = getCell('指定审批领导')
      const proposedScene = getCell('事项提出场景')
      const workItem = getCell('待办事项')
      const formedTimeStr = getCell('形成时间')
      const departmentName = getCell('主责部门')
      const responsibleLeader = getCell('责任领导')
      const responsiblePerson = getCell('责任人')
      const cooperatorsStr = getCell('配合方')
      const workPlan = getCell('工作计划')
      const planCompleteTimeStr = getCell('计划完成时间')
      const progress = getCell('进展情况')

      if (!workItem) {
        errors.push({
          row: rowNum,
          field: '待办事项',
          value: workItem,
          reason: '必填字段不能为空',
        })
      }
      if (!departmentName) {
        errors.push({
          row: rowNum,
          field: '主责部门',
          value: departmentName,
          reason: '必填字段不能为空',
        })
      }
      if (!workPlan) {
        errors.push({
          row: rowNum,
          field: '工作计划',
          value: workPlan,
          reason: '必填字段不能为空',
        })
      }
      if (
        !planCompleteTimeStr ||
        !parseExcelDate(planCompleteTimeStr)
      ) {
        errors.push({
          row: rowNum,
          field: '计划完成时间',
          value: planCompleteTimeStr,
          reason: '必填字段，格式为 YYYY-MM-DD',
        })
      }

      const resolvedDeptId = departmentName
        ? resolveDeptId(departmentName)
        : null
      if (departmentName && !resolvedDeptId) {
        errors.push({
          row: rowNum,
          field: '主责部门',
          value: departmentName,
          reason: `部门"${departmentName}"不存在或不是业务部门，请填写部门全名或缩写代码`,
        })
      }

      const hasProposedLeader =
        proposedLeaderName && leaderNameToId.has(proposedLeaderName)
      const hasApprovalLeader =
        approvalLeaderName && leaderNameToId.has(approvalLeaderName)
      if (!hasProposedLeader && !hasApprovalLeader) {
        errors.push({
          row: rowNum,
          field: '事项提出领导/指定审批领导',
          value: `${proposedLeaderName}/${approvalLeaderName}`,
          reason:
            '事项提出领导或指定审批领导至少需要填写一个，且必须是公司领导（董事长/总经理/副总经理）',
        })
      }

      const cooperators: Array<{
        departmentId: number
        departmentName?: string
        leader?: string
        person?: string
      }> = []
      if (cooperatorsStr) {
        const segments = cooperatorsStr
          .split(/[；;]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
        for (const seg of segments) {
          const parts = seg.split('|').map((s: string) => s.trim())
          const coopDeptName = parts[0] || ''
          const resolvedCoopDeptId = coopDeptName
            ? resolveDeptId(coopDeptName)
            : null
          if (coopDeptName && !resolvedCoopDeptId) {
            errors.push({
              row: rowNum,
              field: '配合方',
              value: seg,
              reason: `配合部门"${coopDeptName}"不存在或不是业务部门`,
            })
          } else if (resolvedCoopDeptId) {
            cooperators.push({
              departmentId: resolvedCoopDeptId,
              departmentName: coopDeptName || undefined,
              leader: parts[1] || undefined,
              person: parts[2] || undefined,
            })
          }
        }
      }

      if (errors.filter((e) => e.row === rowNum).length === 0) {
        rows.push({
          row: rowNum,
          data: {
            type: 'TODO',
            proposedLeaderId: hasProposedLeader
              ? leaderNameToId.get(proposedLeaderName)!
              : null,
            proposedLeaderName,
            approvalLeaderId: hasApprovalLeader
              ? leaderNameToId.get(approvalLeaderName)!
              : null,
            approvalLeaderName,
            proposedScene,
            workItem,
            formedTime: parseExcelDate(formedTimeStr),
            departmentId: resolvedDeptId,
            responsibleLeader: responsibleLeader || null,
            responsiblePerson: responsiblePerson || null,
            cooperators,
            workPlan,
            planCompleteTime: parseExcelDate(planCompleteTimeStr),
            progress,
          },
        })
      }
    }
  }

  return { rows, errors }
}
