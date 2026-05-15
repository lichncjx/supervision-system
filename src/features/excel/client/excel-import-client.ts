import * as XLSX from 'xlsx'
import type { Work } from '@/lib/work-store'
import type { User } from '@/lib/auth'
import type { ExcelRouteType } from '@/features/excel/domain/excel.types'
import { getDepartmentsForExcel, getCompanyLeadersForExcel } from './excel-api'

type ImportedWork = Omit<Work, 'createdAt' | 'updatedAt'>

async function parseDepartmentIdWithDepts(
  value: any,
  departments: Array<{
    id: number
    name: string
    code: string
    isBusiness: boolean
  }>,
) {
  if (!value) return 2
  const text = String(value).trim()
  const byId = departments.find((d) => String(d.id) === text)
  if (byId) return byId.id
  const byName = departments.find((d) => d.name === text)
  if (byName) return byName.id
  const byCode = departments.find((d) => d.code === text)
  if (byCode) return byCode.id
  return 2
}

export async function importWorksFromExcel(
  file: File,
  type: ExcelRouteType,
  user: User,
): Promise<ImportedWork[]> {
  const departments = await getDepartmentsForExcel()
  const companyLeaders = await getCompanyLeadersForExcel()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        const works: ImportedWork[] = []

        for (const row of jsonData) {
          const r = row as any
          let work: ImportedWork

          switch (type) {
            case 'priority':
              if (!r['工作事项']) continue
              work = {
                id: Date.now() + Math.random(),
                title: r['工作事项'],
                type: '重点',
                departmentId: await parseDepartmentIdWithDepts(
                  r['责任部门'],
                  departments,
                ),
                creatorRole: user.role,
                creatorId: user.id,
                action: 'create',
                status: 'draft',
                needCeo: true,
                isInnovation: r['是否为创新工作'] === '是',
                nodes: [],
                businessCategory: r['业务类别'] || '',
                workItem: r['工作事项'],
                workNode: r['工作节点'] || '',
                planCompleteTime: r['完成时间'] || '',
                completeForm: r['完成形式'] || '',
                responsibleLeader: r['责任领导'] || '',
                responsiblePerson: r['责任人'] || '',
              }
              break
            case 'main':
              if (!r['工作事项']) continue
              work = {
                id: Date.now() + Math.random(),
                title: r['工作事项'],
                type: '主要',
                departmentId: await parseDepartmentIdWithDepts(
                  r['责任部门'],
                  departments,
                ),
                creatorRole: user.role,
                creatorId: user.id,
                action: 'create',
                status: 'draft',
                needCeo: false,
                isInnovation: false,
                nodes: [],
                businessCategory: r['业务类别'] || '',
                workItem: r['工作事项'],
                workNode: r['工作节点'] || '',
                planCompleteTime: r['完成时间'] || '',
                completeForm: r['完成形式'] || '',
                responsibleLeader: r['责任领导'] || '',
                responsiblePerson: r['责任人'] || '',
              }
              break
            case 'todo':
              if (!r['待办事项']) continue
              const proposedLeaderName = String(
                r['事项提出领导'] || '',
              ).trim()
              const matchedProposedLeader = companyLeaders.find(
                (leader) =>
                  leader.name === proposedLeaderName ||
                  String(leader.id) === proposedLeaderName,
              )
              const cooperateDeptRaw = String(r['配合部门'] || '').trim()
              const cooperatePersonRaw = String(
                r['配合责任人'] || '',
              ).trim()
              const coopDeptNames = cooperateDeptRaw
                ? cooperateDeptRaw
                    .split('/')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : []
              const coopPersons = cooperatePersonRaw
                ? cooperatePersonRaw
                    .split('/')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : []
              const cooperators = coopDeptNames
                .map((name: string, idx: number) => {
                  const dept = departments.find(
                    (d) => d.name === name || d.code === name,
                  )
                  return {
                    departmentId: dept?.id || 0,
                    departmentName: name,
                    leader: undefined as string | undefined,
                    person: coopPersons[idx] || (undefined as string | undefined),
                  }
                })
                .filter((c) => c.departmentId > 0)

              work = {
                id: Date.now() + Math.random(),
                title: r['待办事项'],
                type: '待办',
                departmentId: await parseDepartmentIdWithDepts(
                  r['责任部门'],
                  departments,
                ),
                creatorRole: user.role,
                creatorId: user.id,
                action: 'todo_decompose',
                status: 'draft',
                needCeo: false,
                proposedLeader:
                  matchedProposedLeader?.name || proposedLeaderName,
                proposedLeaderId: matchedProposedLeader?.id,
                proposedLeaderRole: matchedProposedLeader?.role,
                proposedScene: r['事项提出场景'] || '',
                workItem: r['待办事项'],
                formedTime: r['形成时间'] || '',
                responsiblePerson: r['主责责任人'] || '',
                cooperators,
                workPlan: r['工作计划'] || '',
                planCompleteTime: r['完成时间'] || '',
                progress: r['进展情况'] || '',
              }
              break
            default:
              continue
          }

          works.push(work)
        }

        resolve(works)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}
