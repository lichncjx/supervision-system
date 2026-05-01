import * as XLSX from 'xlsx';
import type { Work } from './work-store';
import type { User } from './auth';

export type ExcelRouteType = 'priority' | 'main' | 'todo';

type ImportedWork = Omit<Work, 'createdAt' | 'updatedAt'>;

let departmentsCache: Array<{ id: number; name: string; code: string; isBusiness: boolean }> | null = null;
let companyLeadersCache: Array<{ id: number; name: string; role: string }> | null = null;

async function getDepartmentsForExcel() {
  if (departmentsCache) return departmentsCache;
  try {
    const response = await fetch('/api/departments', { credentials: 'include' });
    if (response.ok) {
      departmentsCache = await response.json();
    }
  } catch {
  }
  return departmentsCache || [];
}

async function getCompanyLeadersForExcel() {
  if (companyLeadersCache) return companyLeadersCache;
  try {
    const response = await fetch('/api/users/company-leaders', { credentials: 'include' });
    if (response.ok) {
      companyLeadersCache = await response.json();
    }
  } catch {
  }
  return companyLeadersCache || [];
}

async function getDepartmentNameForExcel(id?: number) {
  if (!id) return '';
  const departments = await getDepartmentsForExcel();
  return departments.find((d) => d.id === id)?.name || '';
}

export function getExcelTemplate(type: ExcelRouteType): { buffer: Buffer; fileName: string } {
  let headers: string[] = [];
  let fileName = '';

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
        '主管人员'
      ];
      fileName = '重点工作导入模板.xlsx';
      break;
    case 'main':
      headers = [
        '业务类别',
        '工作事项',
        '工作节点',
        '完成时间',
        '完成形式',
        '责任部门',
        '责任领导',
        '主管人员'
      ];
      fileName = '主要工作导入模板.xlsx';
      break;
    case 'todo':
      headers = [
        '事项提出领导',
        '指定审批领导',
        '事项提出场景',
        '待办事项',
        '形成时间',
        '责任部门',
        '部门责任人',
        '配合部门',
        '配合部门责任人',
        '工作计划',
        '计划完成时间',
        '进展情况'
      ];
      fileName = '待办事项导入模板.xlsx';
      break;
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  return { buffer, fileName };
}

export async function exportWorksToExcel(type: ExcelRouteType, works: Work[]) {
  let headers: string[] = [];
  let rows: any[] = [];
  let fileName = '';

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
        '主管人员'
      ];
      rows = await Promise.all(works.map(async work => [
        work.businessCategory || '',
        work.workItem || '',
        work.isInnovation ? '是' : '否',
        work.workNode || '',
        work.completeTime || '',
        work.completeForm || '',
        await getDepartmentNameForExcel(work.departmentId),
        work.responsibleLeader || '',
        work.supervisor || ''
      ]));
      fileName = '重点工作导出.xlsx';
      break;
    case 'main':
      headers = [
        '业务类别',
        '工作事项',
        '工作节点',
        '完成时间',
        '完成形式',
        '责任部门',
        '责任领导',
        '主管人员'
      ];
      rows = await Promise.all(works.map(async work => [
        work.businessCategory || '',
        work.workItem || '',
        work.workNode || '',
        work.completeTime || '',
        work.completeForm || '',
        await getDepartmentNameForExcel(work.departmentId),
        work.responsibleLeader || '',
        work.supervisor || ''
      ]));
      fileName = '主要工作导出.xlsx';
      break;
    case 'todo':
      headers = [
        '事项提出领导',
        '事项提出场景',
        '待办事项',
        '形成时间',
        '责任部门',
        '部门责任人',
        '配合部门',
        '配合部门责任人',
        '工作计划',
        '计划完成时间',
        '进展情况'
      ];
      rows = await Promise.all(works.map(async work => [
        work.proposedLeader || '',
        work.proposedScene || '',
        work.workItem || '',
        work.formedTime || '',
        await getDepartmentNameForExcel(work.departmentId),
        work.responsiblePerson || '',
        work.cooperateDepartment || '',
        work.cooperatePerson || '',
        work.workPlan || '',
        work.planCompleteTime || '',
        work.progress || ''
      ]));
      fileName = '待办事项导出.xlsx';
      break;
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '数据');
  XLSX.writeFile(workbook, fileName);
}

export async function importWorksFromExcel(
  file: File,
  type: ExcelRouteType,
  user: User
): Promise<ImportedWork[]> {
  const departments = await getDepartmentsForExcel();
  const companyLeaders = await getCompanyLeadersForExcel();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const works: ImportedWork[] = [];

        for (const row of jsonData) {
          const r = row as any;
          let work: ImportedWork;

          switch (type) {
            case 'priority':
              if (!r['工作事项']) continue;
              work = {
                id: Date.now() + Math.random(),
                title: r['工作事项'],
                type: '重点',
                departmentId: await parseDepartmentIdWithDepts(r['责任部门'], departments),
                creatorRole: user.role,
                creatorId: user.id,
                action: 'create',
                status: user.role === 'DEPARTMENT_MANAGER' ? 'pending_dept' : 'pending_company',
                needCeo: true,
                isInnovation: r['是否为创新工作'] === '是',
                nodes: [],
                businessCategory: r['业务类别'] || '',
                workItem: r['工作事项'],
                workNode: r['工作节点'] || '',
                completeTime: r['完成时间'] || '',
                completeForm: r['完成形式'] || '',
                responsibleLeader: r['责任领导'] || '',
                supervisor: r['主管人员'] || ''
              };
              break;
            case 'main':
              if (!r['工作事项']) continue;
              work = {
                id: Date.now() + Math.random(),
                title: r['工作事项'],
                type: '主要',
                departmentId: await parseDepartmentIdWithDepts(r['责任部门'], departments),
                creatorRole: user.role,
                creatorId: user.id,
                action: 'create',
                status: user.role === 'DEPARTMENT_MANAGER' ? 'pending_dept' : 'pending_company',
                needCeo: false,
                isInnovation: false,
                nodes: [],
                businessCategory: r['业务类别'] || '',
                workItem: r['工作事项'],
                workNode: r['工作节点'] || '',
                completeTime: r['完成时间'] || '',
                completeForm: r['完成形式'] || '',
                responsibleLeader: r['责任领导'] || '',
                supervisor: r['主管人员'] || ''
              };
              break;
            case 'todo':
              if (!r['待办事项']) continue;
              const proposedLeaderName = String(r['事项提出领导'] || '').trim();
              const matchedProposedLeader = companyLeaders.find(
                (leader) => leader.name === proposedLeaderName || String(leader.id) === proposedLeaderName
              );
              work = {
                id: Date.now() + Math.random(),
                title: r['待办事项'],
                type: '待办',
                departmentId: await parseDepartmentIdWithDepts(r['责任部门'], departments),
                creatorRole: user.role,
                creatorId: user.id,
                action: 'todo_decompose',
                status:
                  user.role === 'DEPARTMENT_MANAGER'
                    ? 'pending_dept'
                    : user.role === 'DEPARTMENT_LEADER'
                      ? 'pending_company'
                      : 'pending_decompose',
                needCeo: false,
                proposedLeader: matchedProposedLeader?.name || proposedLeaderName,
                proposedLeaderId: matchedProposedLeader?.id,
                proposedLeaderRole: matchedProposedLeader?.role,
                proposedScene: r['事项提出场景'] || '',
                workItem: r['待办事项'],
                formedTime: r['形成时间'] || '',
                responsiblePerson: r['部门责任人'] || '',
                cooperateDepartment: r['配合部门'] || '',
                cooperatePerson: r['配合部门责任人'] || '',
                workPlan: r['工作计划'] || '',
                planCompleteTime: r['计划完成时间'] || '',
                progress: r['进展情况'] || ''
              };
              break;
            default:
              continue;
          }

          works.push(work);
        }

        resolve(works);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

async function parseDepartmentIdWithDepts(value: any, departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>) {
  if (!value) return 2;
  const text = String(value).trim();
  const byId = departments.find((d) => String(d.id) === text);
  if (byId) return byId.id;
  const byName = departments.find((d) => d.name === text);
  if (byName) return byName.id;
  const byCode = departments.find((d) => d.code === text);
  if (byCode) return byCode.id;
  return 2;
}

export async function exportCompanyCompletionRate(works: Work[]) {
  const departments = await getDepartmentsForExcel();

  const getDepartmentNameForExcel = (id?: number) => {
    if (!id) return '';
    return departments.find((d) => d.id === id)?.name || '';
  };

  const formatRate = (completed: number, total: number) => {
    if (total <= 0) return '0%';
    return `${((completed / total) * 100).toFixed(1)}%`;
  };

  const isCompletedForRate = (work: Work) => {
    const status = String(work.status || '').trim();
    return status === 'completed' || status === '已完成';
  };

  const isCancelledForRate = (work: Work) => {
    const status = String(work.status || '').trim();
    return status === 'cancelled' || status === 'canceled' || status === '已取消';
  };

  const getResponsibleDepartmentIds = (work: Work) => {
    const ids = new Set<number>();
    const addId = (value: any) => {
      const id = Number(value);
      if (Number.isFinite(id) && id > 0 && id !== 1) {
        ids.add(id);
      }
    };
    addId(work.departmentId);
    if (Array.isArray(work.departmentIds)) {
      work.departmentIds.forEach(addId);
    }
    return Array.from(ids);
  };

  const calculateRate = (list: Work[]) => {
    const valid = list.filter((w) => !isCancelledForRate(w));
    const completed = valid.filter((w) => isCompletedForRate(w)).length;
    return {
      completed,
      total: valid.length,
      rate: formatRate(completed, valid.length),
    };
  };

  const departmentIds = departments
    .filter((d) => d.id !== 1)
    .map((d) => d.id);

  const headers = [
    '部门',
    '重点工作完成率',
    '主要工作完成率',
    '待办事项完成率',
    '总完成率',
  ];

  const rows = departmentIds.map((departmentId) => {
    const deptWorks = works.filter((work) =>
      getResponsibleDepartmentIds(work).includes(departmentId)
    );

    const priority = calculateRate(deptWorks.filter((w) => w.type === '重点'));
    const main = calculateRate(deptWorks.filter((w) => w.type === '主要'));
    const todo = calculateRate(deptWorks.filter((w) => w.type === '待办'));
    const total = calculateRate(deptWorks);

    return [
      getDepartmentNameForExcel(departmentId),
      priority.rate,
      main.rate,
      todo.rate,
      total.rate,
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '公司完成率');
  XLSX.writeFile(workbook, '公司完成率.xlsx');
}
