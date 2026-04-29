import * as XLSX from 'xlsx';
import type { Work } from './work-store';
import type { User } from './auth';
import { departments, getCompanyLeaders } from './auth';

export type ExcelRouteType = 'priority' | 'main' | 'todo';

type ImportedWork = Omit<Work, 'created_at' | 'updated_at'>;

function parseDepartmentId(value: any) {
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

function getDepartmentNameForExcel(id?: number) {
  if (!id) return '';
  return departments.find((d) => d.id === id)?.name || '';
}

export function downloadExcelTemplate(type: ExcelRouteType) {
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
      fileName = '重点工作模板.xlsx';
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
      fileName = '主要工作模板.xlsx';
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
      fileName = '待办事项模板.xlsx';
      break;
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
  XLSX.writeFile(workbook, fileName);
}

export function exportWorksToExcel(type: ExcelRouteType, works: Work[]) {
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
      rows = works.map(work => [
        work.business_category || '',
        work.work_item || '',
        work.is_innovation ? '是' : '否',
        work.work_node || '',
        work.complete_time || '',
        work.complete_form || '',
        getDepartmentNameForExcel(work.department_id),
        work.responsible_leader || '',
        work.supervisor || ''
      ]);
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
      rows = works.map(work => [
        work.business_category || '',
        work.work_item || '',
        work.work_node || '',
        work.complete_time || '',
        work.complete_form || '',
        getDepartmentNameForExcel(work.department_id),
        work.responsible_leader || '',
        work.supervisor || ''
      ]);
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
      rows = works.map(work => [
        work.proposed_leader || '',
        work.proposed_scene || '',
        work.work_item || '',
        work.formed_time || '',
        getDepartmentNameForExcel(work.department_id),
        work.responsible_person || '',
        work.cooperate_department || '',
        work.cooperate_person || '',
        work.work_plan || '',
        work.plan_complete_time || '',
        work.progress || ''
      ]);
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const works: ImportedWork[] = [];

        jsonData.forEach((row: any) => {
          let work: ImportedWork;

          switch (type) {
            case 'priority':
              if (!row['工作事项']) return;
              work = {
                id: Date.now() + Math.random(),
                title: row['工作事项'],
                type: '重点',
                department_id: parseDepartmentId(row['责任部门']),
                creator_role: user.role,
                creator_id: user.id,
                action: 'create',
                status: user.role === 'department_manager' ? 'submitted' : 'dept_approved',
                need_ceo: true,
                is_innovation: row['是否为创新工作'] === '是',
                nodes: [],
                business_category: row['业务类别'] || '',
                work_item: row['工作事项'],
                work_node: row['工作节点'] || '',
                complete_time: row['完成时间'] || '',
                complete_form: row['完成形式'] || '',
                responsible_leader: row['责任领导'] || '',
                supervisor: row['主管人员'] || ''
              };
              break;
            case 'main':
              if (!row['工作事项']) return;
              work = {
                id: Date.now() + Math.random(),
                title: row['工作事项'],
                type: '主要',
                department_id: parseDepartmentId(row['责任部门']),
                creator_role: user.role,
                creator_id: user.id,
                action: 'create',
                status: user.role === 'department_manager' ? 'submitted' : 'dept_approved',
                need_ceo: false,
                is_innovation: false,
                nodes: [],
                business_category: row['业务类别'] || '',
                work_item: row['工作事项'],
                work_node: row['工作节点'] || '',
                complete_time: row['完成时间'] || '',
                complete_form: row['完成形式'] || '',
                responsible_leader: row['责任领导'] || '',
                supervisor: row['主管人员'] || ''
              };
              break;
            case 'todo':
              if (!row['待办事项']) return;
              const proposedLeaderName = String(row['事项提出领导'] || '').trim();
              const matchedProposedLeader = getCompanyLeaders().find(
                (leader) => leader.name === proposedLeaderName || String(leader.id) === proposedLeaderName
              );
              work = {
                id: Date.now() + Math.random(),
                title: row['待办事项'],
                type: '待办',
                department_id: parseDepartmentId(row['责任部门']),
                creator_role: user.role,
                creator_id: user.id,
                action: 'todo_decompose',
                status:
                  user.role === 'department_manager'
                    ? 'submitted'
                    : user.role === 'department_leader'
                      ? 'dept_approved'
                      : 'todo_pending_decompose',
                need_ceo: false,
                proposed_leader: matchedProposedLeader?.name || proposedLeaderName,
                proposed_leader_id: matchedProposedLeader?.id,
                proposed_leader_role: matchedProposedLeader?.role,
                proposed_scene: row['事项提出场景'] || '',
                work_item: row['待办事项'],
                formed_time: row['形成时间'] || '',
                responsible_person: row['部门责任人'] || '',
                cooperate_department: row['配合部门'] || '',
                cooperate_person: row['配合部门责任人'] || '',
                work_plan: row['工作计划'] || '',
                plan_complete_time: row['计划完成时间'] || '',
                progress: row['进展情况'] || ''
              };
              break;
            default:
              return;
          }

          works.push(work);
        });

        resolve(works);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

export function exportCompanyCompletionRate(works: Work[]) {
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
    addId(work.department_id);
    if (Array.isArray(work.department_ids)) {
      work.department_ids.forEach(addId);
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
  XLSX.writeFile(workbook, '公司完成率（公开）.xlsx');
}
