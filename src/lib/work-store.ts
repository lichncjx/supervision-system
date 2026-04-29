import { isCompanyLevel, type User } from '@/lib/auth';

export type WorkType = '重点' | '主要' | '待办';

export type WorkStatusFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'inProgress'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'overdue';

export interface WorkQuery {
  type?: WorkType | '全部';
  departmentId?: number | '全部';
  status?: WorkStatusFilter;
  keyword?: string;
}

export type Status =
  | 'draft'
  | 'submitted'
  | 'dept_approved'
  | 'company_approved'
  | 'active'
  | 'todo_pending_decompose'
  | 'material_submitted'
  | 'completed'
  | 'rejected'
  | 'adjusting'
  | 'canceling'
  | 'ceo_pending_cancel'
  | 'cancelled'
  | 'returned_for_edit'
  | 'material_returned'
  | 'adjust_returned'
  | 'cancel_returned';

export type ActionType =
  | 'create'
  | 'complete'
  | 'adjust'
  | 'cancel'
  | 'todo_decompose';

export interface WorkSubNode {
  id: number;
  title: string;
  complete_time?: string;
}

export interface WorkNode {
  id: number;
  title: string;
  complete_time?: string;
  children: WorkSubNode[];
}

export interface ProofFile {
  id: number;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploaded_at: string;
  uploaded_by?: string;
}

export interface AdjustHistory {
  id: number;
  reason: string;
  field: 'complete_time' | 'plan_complete_time' | 'due_date';
  from_time?: string;
  to_time?: string;
  requested_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface Work {
  id: number;
  title: string;
  description?: string;
  type: WorkType;
  department_id: number;
  creator_role: string;
  creator_id?: number;
  status: Status;
  action: ActionType;
  need_ceo: boolean;
  proof?: string;
  proof_files?: ProofFile[];
  adjust_reason?: string;
  cancel_reason?: string;
  adjust_new_time?: string;        // 调整后的时间
  adjust_time_type?: 'complete_time' | 'plan_complete_time';  // 调整的是哪个时间字段
  created_at: string;
  updated_at: string;
  due_date?: string;
  // 新增字段
  is_innovation?: boolean;        // 是否为创新工作
  nodes?: WorkNode[];             // 工作节点，两层结构
  business_category?: string;      // 业务类别
  work_item?: string;              // 工作事项
  work_node?: string;              // 工作节点
  complete_time?: string;          // 完成时间
  complete_form?: string;          // 完成形式
  responsible_leader?: string;     // 责任领导
  supervisor?: string;             // 主管人员
  proposed_leader?: string;        // 事项提出领导
  proposed_leader_id?: number;     // 事项提出领导用户ID
  proposed_leader_role?: string;   // 事项提出领导角色
  proposed_scene?: string;         // 事项提出场景
  formed_time?: string;            // 形成时间
  responsible_person?: string;     // 责任部门责任人
  cooperate_department?: string;   // 配合部门
  cooperate_person?: string;       // 配合部门责任人
  
  // 多选字段
  department_ids?: number[];              // 多选责任部门
  responsible_persons?: string[];         // 多选责任部门责任人
  cooperate_department_ids?: number[];    // 多选配合部门
  cooperate_departments?: string[];       // 多选配合部门名称
  cooperate_persons?: string[];           // 多选配合部门责任人
  
  work_plan?: string;              // 工作计划
  plan_complete_time?: string;     // 计划完成时间
  progress?: string;               // 进展情况
  reject_reason?: string;          // 退回原因
  rejected_at?: string;            // 退回时间
  rejected_from?: Status;          // 从哪个状态退回
  rejected_by?: string;            // 退回人
  rejected_by_role?: string;       // 退回人角色
  pending_adjustment?: Partial<Work>; // 待审批的调整内容
  pending_adjustment_reason?: string; // 调整原因

  //调整前后时间追溯
  pending_adjustment_from_time?: string;
  pending_adjustment_to_time?: string;
  pending_adjustment_time_field?: 'complete_time' | 'plan_complete_time' | 'due_date';
  adjust_history?: AdjustHistory[];

  //调整/取消时选择的公司审批领导
  approval_leader?: string;
  approval_leader_id?: number;
  approval_leader_role?: string;
}

export type WorkEditablePatch = Partial<Pick< 
  Work, 
  | 'title' 
  | 'description' 
  | 'business_category' 
  | 'work_item' 
  | 'work_node' 
  | 'nodes' 
  | 'is_innovation' 
  | 'complete_time' 
  | 'complete_form' 
  | 'department_id' 
  | 'department_ids' 
  | 'responsible_leader' 
  | 'supervisor' 
  | 'proposed_leader' 
  | 'proposed_leader_id' 
  | 'proposed_leader_role' 
  | 'proposed_scene' 
  | 'formed_time' 
  | 'responsible_person' 
  | 'responsible_persons' 
  | 'cooperate_department' 
  | 'cooperate_person' 
  | 'cooperate_department_ids' 
  | 'cooperate_departments' 
  | 'cooperate_persons' 
  | 'work_plan' 
  | 'plan_complete_time' 
  | 'progress' 
  | 'due_date' 
  | 'approval_leader' 
  | 'approval_leader_id' 
  | 'approval_leader_role' 
>>;

const WORKS_KEY = 'supervision_works';

let works: Work[] = [];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function loadWorks() {
  if (!canUseStorage()) return;

  const raw = localStorage.getItem(WORKS_KEY);
  if (!raw) {
    works = [];
    return;
  }

  try {
    works = JSON.parse(raw) as Work[];
  } catch {
    works = [];
  }
}

function saveWorks() {
  if (!canUseStorage()) return;
  localStorage.setItem(WORKS_KEY, JSON.stringify(works));
}

export function getWorks() {
  loadWorks();
  return works;
}

export function getVisibleWorks(user: User | null | undefined, type?: WorkType) {
  loadWorks();

  let list = works;

  if (type) {
    list = list.filter((w) => w.type === type);
  }

  if (!user) return [];

  if (isCompanyLevel(user.role, user.department_id)) {
    return sortWorksByDueDate(list);
  }

  return sortWorksByDueDate(
    list.filter((w) => isWorkRelatedToDepartment(w, user.department_id))
  );
}

export function getWorkById(id: number) {
  loadWorks();
  return works.find((w) => w.id === id);
}

export function queryWorks(user: User | null | undefined, query: WorkQuery) {
  let list = getVisibleWorks(user);

  if (query.type && query.type !== '全部') {
    list = list.filter((w) => w.type === query.type);
  }

  if (query.departmentId && query.departmentId !== '全部') {
    list = list.filter((w) => isWorkRelatedToDepartment(w, Number(query.departmentId)));
  }

  if (query.status && query.status !== 'all') {
    if (query.status === 'pending') {
      list = list.filter((w) => isPendingStatus(w.status));
    }

    if (query.status === 'inProgress') {
      list = list.filter((w) => isInProgressStatus(w.status));
    }

    if (query.status === 'completed') {
      list = list.filter((w) => w.status === 'completed');
    }

    if (query.status === 'rejected') {
      list = list.filter((w) => w.status === 'rejected');
    }

    if (query.status === 'cancelled') {
      list = list.filter((w) => w.status === 'cancelled');
    }

    if (query.status === 'overdue') {
      list = list.filter((w) => isOverdueWork(w));
    }
  }

  if (query.keyword && query.keyword.trim()) {
    const keyword = query.keyword.trim();

    list = list.filter((w) =>
      [
        w.title,
        w.work_item,
        w.description,
        w.business_category,
        w.proposed_leader,
        w.proposed_scene,
        w.responsible_leader,
        w.supervisor,
        w.responsible_person,
        w.progress,
        w.work_plan,
      ]
        .filter(Boolean)
        .some((v) => String(v).includes(keyword))
    );
  }

  return sortWorksByDueDate(list);
}

export function addWork(work: Omit<Work, 'created_at' | 'updated_at'>) {
  loadWorks();

  const now = new Date().toISOString();
  const full: Work = {
    ...work,
    created_at: now,
    updated_at: now,
  };

  works = [full, ...works];
  saveWorks();

  return full;
}

export function updateWork(id: number, patch: Partial<Work>) {
  loadWorks();

  works = works.map((w) =>
    w.id === id
      ? {
          ...w,
          ...patch,
          updated_at: new Date().toISOString(),
        }
      : w
  );

  saveWorks();

  return getWorkById(id);
}

export function deleteWork(id: number) {
  loadWorks();
  works = works.filter((w) => w.id !== id);
  saveWorks();
}

function getSubmitStatusByUserRole(user: User) {
  if (user.role === 'department_manager') {
    return 'submitted' as Status;
  }

  if (
    user.role === 'department_leader' ||
    user.role === 'admin' ||
    user.role === 'vice_president' ||
    user.role === 'president'
  ) {
    return 'dept_approved' as Status;
  }

  return 'submitted' as Status;
}

export function resubmitRejectedWork(work: Work, user: User, patch: WorkEditablePatch) {
  const nextStatus = getSubmitStatusByUserRole(user);

  return updateWork(work.id, {
    ...patch,
    title: patch.title || patch.work_item || work.title,
    status: nextStatus,
    action: work.action || 'create',
    reject_reason: undefined,
    rejected_at: undefined,
    rejected_from: undefined,
    rejected_by: undefined,
    rejected_by_role: undefined,
  });
}

export function resubmitReturnedWork(work: Work) {
  if (work.status !== 'returned_for_edit') {
    return work;
  }

  if (work.creator_role === 'department_manager') {
    return updateWork(work.id, {
      status: 'submitted',
      reject_reason: undefined,
      rejected_at: undefined,
      rejected_from: undefined,
      rejected_by: undefined,
      rejected_by_role: undefined,
    });
  }

  return updateWork(work.id, {
    status: 'dept_approved',
    reject_reason: undefined,
    rejected_at: undefined,
    rejected_from: undefined,
    rejected_by: undefined,
    rejected_by_role: undefined,
  });
}

export function getStatusName(status: Status) {
  const map: Record<Status, string> = {
    draft: '草稿',
    submitted: '待部门审批',
    dept_approved: '待公司审批',
    company_approved: '公司已审批',
    active: '进行中',
    todo_pending_decompose: '待部门分解',
    material_submitted: '材料待部门审批',
    completed: '已完成',
    rejected: '已退回',
    adjusting: '调整审批中',
    canceling: '取消待公司审批',
    ceo_pending_cancel: '待一把手审批取消',
    cancelled: '已取消',
    returned_for_edit: '退回待修改',
    material_returned: '材料退回待补充',
    adjust_returned: '调整退回待修改',
    cancel_returned: '取消申请退回',
  };
  return map[status] || status;
}

export function getActionName(action: ActionType) {
  const map: Record<ActionType, string> = {
    create: '新建审批',
    complete: '完成审批',
    adjust: '调整审批',
    cancel: '取消审批',
    todo_decompose: '待办分解审批',
  };
  return map[action] || action;
}

export function isPendingStatus(status: Status) {
  return isPendingApprovalStatus(status);
}

export function isInProgressStatus(status: Status) {
  return [
    'active',
    'company_approved',
    'material_returned',
    'adjust_returned',
    'cancel_returned',
  ].includes(status);
}

export function getWorkDueDate(work: Work) {
  return work.complete_time || work.plan_complete_time || work.due_date || '';
}

export function isOverdueWork(work: Work) {
  const date = getWorkDueDate(work);
  if (!date) return false;

  if (['completed', 'cancelled', 'rejected'].includes(work.status)) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return target.getTime() < today.getTime();
}

export function sortWorksByDueDate<T extends Work>(list: T[]) {
  return [...list].sort((a, b) => {
    const da = getWorkDueDate(a);
    const db = getWorkDueDate(b);

    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;

    return new Date(da).getTime() - new Date(db).getTime();
  });
}

function getWorkDepartmentIds(work: Work) {
  const ids = new Set<number>();
  const addId = (value: any) => {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      ids.add(id);
    }
  };
  addId(work.department_id);
  if (Array.isArray(work.department_ids)) {
    work.department_ids.forEach(addId);
  }
  if (Array.isArray(work.cooperate_department_ids)) {
    work.cooperate_department_ids.forEach(addId);
  }
  return Array.from(ids);
}

function isWorkRelatedToDepartment(work: Work, departmentId?: number) {
  if (!departmentId) return false;
  return getWorkDepartmentIds(work).includes(Number(departmentId));
}

export function isReturnStatus(status: Status) {
  return [
    'returned_for_edit',
    'material_returned',
    'adjust_returned',
    'cancel_returned',
  ].includes(status);
}

export function isPendingApprovalStatus(status: Status) {
  return [
    'submitted',
    'dept_approved',
    'material_submitted',
    'canceling',
    'ceo_pending_cancel',
  ].includes(status);
}

export function isExpiringWork(work: Work) {
  const date = getWorkDueDate(work);
  if (!date) return false;

  if (['completed', 'cancelled', 'rejected'].includes(work.status)) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();

  return diff >= 0 && diff <= 15 * 24 * 60 * 60 * 1000;
}

export type WorkFilter = 'all' | 'pending' | 'inProgress' | 'completed' | 'overdue';

export function getFilteredWorks(user: User | null | undefined, filter: WorkFilter) {
  const list = getVisibleWorks(user);

  if (filter === 'all') return list;
  if (filter === 'pending') return list.filter((w) => isPendingStatus(w.status));
  if (filter === 'inProgress') return list.filter((w) => isInProgressStatus(w.status));
  if (filter === 'completed') return list.filter((w) => w.status === 'completed');
  if (filter === 'overdue') return list.filter((w) => isOverdueWork(w));

  return list;
}

function isCompanyApprovalUser(user: User | null | undefined) {
  return !!user && (user.role === 'vice_president' || user.role === 'president');
}

function isPresidentUser(user: User | null | undefined) {
  return !!user && user.role === 'president';
}

function getAdjustmentTimeField(work: Work): 'complete_time' | 'plan_complete_time' | 'due_date' {
  if (work.type === '待办') return 'plan_complete_time';
  if (work.complete_time !== undefined) return 'complete_time';
  return 'due_date';
}

function getAdjustmentTimeValue(work: Partial<Work>, field: 'complete_time' | 'plan_complete_time' | 'due_date') {
  return String(work[field] || '');
}

function buildAdjustHistory(work: Work, user: User): AdjustHistory {
  const field = work.pending_adjustment_time_field || getAdjustmentTimeField(work);

  return {
    id: Date.now(),
    reason: work.pending_adjustment_reason || work.adjust_reason || '',
    field,
    from_time: work.pending_adjustment_from_time || '',
    to_time: work.pending_adjustment_to_time || '',
    requested_at: work.updated_at || new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: user.name,
  };
}

function clearPendingFields() {
  return {
    pending_adjustment: undefined,
    pending_adjustment_reason: undefined,
    pending_adjustment_from_time: undefined,
    pending_adjustment_to_time: undefined,
    pending_adjustment_time_field: undefined,
  };
}

function clearApprovalLeaderFields() {
  return {
    approval_leader: undefined,
    approval_leader_id: undefined,
    approval_leader_role: undefined,
  };
}

function isSelectedCompanyApprover(user: User, work: Work) {
  // 系统管理员最高权限，可以代办所有公司审批
  if (user.role === 'admin') {
    return true;
  }

  // 督办管理员只查看，不审批
  if (user.role === 'supervisor') {
    return false;
  }

  if (
    (work.action === 'adjust' || work.action === 'cancel') &&
    work.approval_leader_id
  ) {
    return work.approval_leader_id === user.id;
  }

  // 待办事项审批必须回到事项提出领导
  if (work.type === '待办' && work.proposed_leader_id) {
    return work.proposed_leader_id === user.id;
  }

  // 重点/主要工作默认由公司主管领导审批，一把手也具备主管领导权限
  return isCompanyApprovalUser(user);
}

export function canHandleWork(user: User | null | undefined, work: Work) {
  if (!user) return false;

  // 督办管理员只查看，不处理
  if (user.role === 'supervisor') {
    return false;
  }

  // 系统管理员最高权限，所有待审批、待分解、退回事项都能处理
  if (user.role === 'admin') {
    return (
      canApproveWork(user, work) ||
      work.status === 'todo_pending_decompose' ||
      isReturnStatus(work.status)
    );
  }

  if (canApproveWork(user, work)) {
    return true;
  }

  if (
    work.type === '待办' &&
    work.status === 'todo_pending_decompose' &&
    (user.role === 'department_manager' || user.role === 'department_leader') &&
    isWorkRelatedToDepartment(work, user.department_id)
  ) {
    return true;
  }

  if (
    isReturnStatus(work.status) &&
    (user.role === 'department_manager' || user.role === 'department_leader') &&
    isWorkRelatedToDepartment(work, user.department_id)
  ) {
    return true;
  }

  if (
    isReturnStatus(work.status) &&
    work.creator_id === user.id
  ) {
    return true;
  }

  return false;
}

export function canApproveWork(user: User | null | undefined, work: Work) {
  if (!user) return false;

  const pendingStatuses: Status[] = [
    'submitted',
    'dept_approved',
    'material_submitted',
    'canceling',
    'ceo_pending_cancel',
  ];

  if (!pendingStatuses.includes(work.status)) {
    return false;
  }

  // 系统管理员最高权限，可以审批所有待审批事项
  if (user.role === 'admin') {
    return true;
  }

  // 督办管理员只查看，不审批
  if (user.role === 'supervisor') {
    return false;
  }

  if (user.role === 'department_leader') {
    return (
      isWorkRelatedToDepartment(work, user.department_id) &&
      (
        work.status === 'submitted' ||
        work.status === 'material_submitted'
      )
    );
  }

  if (work.status === 'dept_approved') {
    return isSelectedCompanyApprover(user, work);
  }

  if (work.status === 'canceling') {
    return isSelectedCompanyApprover(user, work);
  }

  if (work.status === 'ceo_pending_cancel') {
    return user.role === 'president';
  }

  return false;
}

export function approveWork(user: User, work: Work) {
  // 一、部门领导审批
  if (user.role === 'department_leader') {
    if (work.status === 'submitted') {
      // 部门领导通过取消申请后，进入公司取消审批
      if (work.action === 'cancel') {
        return updateWork(work.id, { status: 'canceling' });
      }

      // 部门领导通过新建、调整、待办分解后，进入公司审批
      return updateWork(work.id, { status: 'dept_approved' });
    }

    if (work.status === 'material_submitted') {
      return updateWork(work.id, { status: 'dept_approved' });
    }
  }

  // 二、待办事项：公司审批人原则上为事项提出领导；
  // 如果调整/取消时单独选择了公司审批领导，则以 approval_leader_id 为准
  if (work.type === '待办') {
    if (isSelectedCompanyApprover(user, work)) {
      if (work.action === 'complete') {
        return updateWork(work.id, {
          status: 'completed',
          reject_reason: undefined,
          rejected_at: undefined,
          rejected_from: undefined,
          rejected_by: undefined,
          rejected_by_role: undefined,
          ...clearApprovalLeaderFields(),
        });
      }

      if (work.action === 'adjust') {
        const history = buildAdjustHistory(work, user);

        return updateWork(work.id, {
          ...(work.pending_adjustment || {}),
          status: 'active',
          action: 'todo_decompose',
          adjust_reason: work.pending_adjustment_reason || work.adjust_reason,
          adjust_new_time: work.pending_adjustment_to_time || work.adjust_new_time,
          adjust_history: [...(work.adjust_history || []), history],
          ...clearPendingFields(),
          ...clearApprovalLeaderFields(),
          reject_reason: undefined,
          rejected_at: undefined,
          rejected_from: undefined,
          rejected_by: undefined,
          rejected_by_role: undefined,
        });
      }

      if (work.action === 'cancel') {
        return updateWork(work.id, {
          status: 'cancelled',
          reject_reason: undefined,
          rejected_at: undefined,
          rejected_from: undefined,
          rejected_by: undefined,
          rejected_by_role: undefined,
          ...clearApprovalLeaderFields(),
        });
      }

      // 待办事项分解审批通过后，正式进入进行中
      return updateWork(work.id, {
        status: 'active',
        action: 'todo_decompose',
        reject_reason: undefined,
        rejected_at: undefined,
        rejected_from: undefined,
        rejected_by: undefined,
        rejected_by_role: undefined,
        ...clearApprovalLeaderFields(),
      });
    }

    return work;
  }

  // 三、重点工作/主要工作：公司主管领导审批
  // 一把手兼具主管领导权限，因此 president 也可以走这里
  if (isCompanyApprovalUser(user) && isSelectedCompanyApprover(user, work)) {
    if (work.action === 'cancel') {
      // 重点工作取消：
      // 如果审批人是副总，则还要到一把手；
      // 如果审批人本身就是一把手，则直接取消，避免重复审批。
      if (work.type === '重点') {
        if (user.role === 'president') {
          return updateWork(work.id, {
            status: 'cancelled',
            ...clearApprovalLeaderFields(),
          });
        }

        return updateWork(work.id, { status: 'ceo_pending_cancel' });
      }

      return updateWork(work.id, {
        status: 'cancelled',
        ...clearApprovalLeaderFields(),
      });
    }

    if (work.action === 'complete') {
      return updateWork(work.id, {
        status: 'completed',
        ...clearApprovalLeaderFields(),
      });
    }

    if (work.action === 'adjust') {
      const history = buildAdjustHistory(work, user);

      return updateWork(work.id, {
        ...(work.pending_adjustment || {}),
        status: 'active',
        action: 'create',
        adjust_reason: work.pending_adjustment_reason || work.adjust_reason,
        adjust_new_time: work.pending_adjustment_to_time || work.adjust_new_time,
        adjust_history: [...(work.adjust_history || []), history],
        ...clearPendingFields(),
        ...clearApprovalLeaderFields(),
      });
    }

    return updateWork(work.id, {
      status: 'active',
      ...clearApprovalLeaderFields(),
    });
  }

  // 四、重点工作取消：一把手最终审批
  if (user.role === 'president') {
    if (work.status === 'ceo_pending_cancel') {
      return updateWork(work.id, {
        status: 'cancelled',
        ...clearApprovalLeaderFields(),
      });
    }
  }

  // 五、admin 代办逻辑
  if (user.role === 'admin') {
    if (work.status === 'submitted') {
      if (work.action === 'cancel') {
        return updateWork(work.id, { status: 'canceling' });
      }

      return updateWork(work.id, { 
        status: 'dept_approved',
        reject_reason: undefined,
        rejected_at: undefined,
        rejected_from: undefined,
        rejected_by: undefined,
        rejected_by_role: undefined,
      });
    }

    if (work.status === 'material_submitted') {
      return updateWork(work.id, { 
        status: 'dept_approved',
        reject_reason: undefined,
        rejected_at: undefined,
        rejected_from: undefined,
        rejected_by: undefined,
        rejected_by_role: undefined,
      });
    }

    if (work.status === 'dept_approved') {
      if (work.action === 'complete') {
        return updateWork(work.id, { 
          status: 'completed',
          reject_reason: undefined,
          rejected_at: undefined,
          rejected_from: undefined,
          rejected_by: undefined,
          rejected_by_role: undefined,
          ...clearApprovalLeaderFields(),
        });
      }

      if (work.action === 'adjust') {
        const history = buildAdjustHistory(work, user);

        return updateWork(work.id, {
          ...(work.pending_adjustment || {}),
          status: 'active',
          action: 'create',
          adjust_reason: work.pending_adjustment_reason || work.adjust_reason,
          adjust_new_time: work.pending_adjustment_to_time || work.adjust_new_time,
          adjust_history: [...(work.adjust_history || []), history],
          ...clearPendingFields(),
          ...clearApprovalLeaderFields(),
          reject_reason: undefined,
          rejected_at: undefined,
          rejected_from: undefined,
          rejected_by: undefined,
          rejected_by_role: undefined,
        });
      }

      return updateWork(work.id, {
      status: 'active',
      action: work.action,
      reject_reason: undefined,
      rejected_at: undefined,
      rejected_from: undefined,
      rejected_by: undefined,
      rejected_by_role: undefined,
      ...clearApprovalLeaderFields(),
    });
  }

  if (work.status === 'canceling') {
      if (work.type === '重点') {
        if (work.approval_leader_role === 'president') {
          return updateWork(work.id, { 
            status: 'cancelled',
            ...clearApprovalLeaderFields(),
          });
        }

        return updateWork(work.id, { status: 'ceo_pending_cancel' });
      }

      return updateWork(work.id, { 
        status: 'cancelled',
        ...clearApprovalLeaderFields(),
      });
    }

    if (work.status === 'ceo_pending_cancel') {
      return updateWork(work.id, { 
        status: 'cancelled',
        ...clearApprovalLeaderFields(),
      });
    }
  }

  return work;
}

export function rejectWork(work: Work, user: User, reason = '审批退回') {
  const now = new Date().toISOString();

  // 完成材料被退回：事项仍然进行中，只是材料退回待补充
  if (work.action === 'complete' || work.status === 'material_submitted') {
    return updateWork(work.id, {
      status: 'material_returned',
      reject_reason: reason,
      rejected_at: now,
      rejected_from: work.status,
      rejected_by: user.name,
      rejected_by_role: user.role,
    });
  }

  // 调整申请被退回：事项继续进行中，调整申请退回
  if (work.action === 'adjust' || work.status === 'adjusting') {
    return updateWork(work.id, {
      status: 'adjust_returned',
      pending_adjustment: undefined,
      pending_adjustment_reason: undefined,
      pending_adjustment_from_time: undefined,
      pending_adjustment_to_time: undefined,
      pending_adjustment_time_field: undefined,
      ...clearApprovalLeaderFields(),
      reject_reason: reason,
      rejected_at: now,
      rejected_from: work.status,
      rejected_by: user.name,
      rejected_by_role: user.role,
    });
  }

  // 取消申请被退回：事项继续进行中，取消申请退回
  if (
    work.action === 'cancel' ||
    work.status === 'canceling' ||
    work.status === 'ceo_pending_cancel'
  ) {
    return updateWork(work.id, {
      status: 'cancel_returned',
      cancel_reason: undefined,
      ...clearApprovalLeaderFields(),
      reject_reason: reason,
      rejected_at: now,
      rejected_from: work.status,
      rejected_by: user.name,
      rejected_by_role: user.role,
    });
  }

  // 新建/分解审批被退回：退回待修改，允许修改后重新提交
  if (
    work.action === 'create' ||
    work.action === 'todo_decompose' ||
    work.status === 'submitted' ||
    work.status === 'dept_approved'
  ) {
    return updateWork(work.id, {
      status: 'returned_for_edit',
      reject_reason: reason,
      rejected_at: now,
      rejected_from: work.status,
      rejected_by: user.name,
      rejected_by_role: user.role,
    });
  }

  return updateWork(work.id, {
    status: 'returned_for_edit',
    reject_reason: reason,
    rejected_at: now,
    rejected_from: work.status,
    rejected_by: user.name,
    rejected_by_role: user.role,
  });
}

export function submitComplete(
  work: Work,
  user: User,
  proof: string,
  proofFiles?: ProofFile[]
) {
  const nextProofFiles = [
    ...(work.proof_files || []),
    ...(proofFiles || []),
  ];

  if (user.role === 'department_leader') {
    return updateWork(work.id, {
      action: 'complete',
      status: 'dept_approved',
      proof,
      proof_files: nextProofFiles,
      ...clearApprovalLeaderFields(),
    });
  }

  return updateWork(work.id, {
    action: 'complete',
    status: 'material_submitted',
    proof,
    proof_files: nextProofFiles,
    ...clearApprovalLeaderFields(),
  });
}

export function submitAdjust(
  work: Work,
  user: User,
  reason: string,
  pendingAdjustment?: WorkEditablePatch,
  approvalLeader?: User
) {
  const field = getAdjustmentTimeField(work);
  const fromTime = getAdjustmentTimeValue(work, field);
  const toTime = getAdjustmentTimeValue(pendingAdjustment || {}, field);

  return updateWork(work.id, {
    action: 'adjust',

    // 部门主管提交调整，必须先到部门领导；
    // 部门领导或管理员提交调整，直接进入公司审批。
    status: user.role === 'department_manager' ? 'submitted' : 'dept_approved',

    adjust_reason: reason,
    pending_adjustment: pendingAdjustment,
    pending_adjustment_reason: reason,
    pending_adjustment_from_time: fromTime,
    pending_adjustment_to_time: toTime,
    pending_adjustment_time_field: field,
    adjust_new_time: toTime,

    approval_leader: approvalLeader?.name,
    approval_leader_id: approvalLeader?.id,
    approval_leader_role: approvalLeader?.role,

    reject_reason: undefined,
    rejected_at: undefined,
    rejected_from: undefined,
  });
}

export function submitCancel(
  work: Work,
  user: User,
  reason: string,
  approvalLeader?: User
) {
  return updateWork(work.id, {
    action: 'cancel',

    // 部门主管申请取消，必须先到部门领导；
    // 部门领导或管理员申请取消，直接进入公司审批。
    status: user.role === 'department_manager' ? 'submitted' : 'canceling',

    cancel_reason: reason,

    approval_leader: approvalLeader?.name,
    approval_leader_id: approvalLeader?.id,
    approval_leader_role: approvalLeader?.role,

    reject_reason: undefined,
    rejected_at: undefined,
    rejected_from: undefined,
  });
}

export function submitTodoDecomposition(
  work: Work,
  user: User,
  patch: WorkEditablePatch
) {
  return updateWork(work.id, {
    ...patch,
    title: patch.work_item || patch.title || work.title,
    action: 'todo_decompose',

    // 部门主管分解后，先给部门领导审批；
    // 部门领导分解后，直接给事项提出领导审批。
    status: user.role === 'department_manager' ? 'submitted' : 'dept_approved',

    reject_reason: undefined,
    rejected_at: undefined,
    rejected_from: undefined,
  });
}

export function getStats(user: User | null | undefined) {
  const list = getVisibleWorks(user);
  const pendingHandleList = list.filter((w) => canHandleWork(user, w));

  return {
    total: list.length,
    pending: list.filter((w) => isPendingStatus(w.status)).length,
    pendingApproval: list.filter((w) => isPendingStatus(w.status)).length,
    processing: pendingHandleList.length,
    inProgress: list.filter((w) => isInProgressStatus(w.status)).length,
    completed: list.filter((w) => w.status === 'completed').length,
    overdue: list.filter((w) => isOverdueWork(w)).length,
    expiring: list.filter((w) => isExpiringWork(w)).length,
    priority: list.filter((w) => w.type === '重点').length,
    main: list.filter((w) => w.type === '主要').length,
    todo: list.filter((w) => w.type === '待办').length,
  };
}

export interface WorkflowStep {
  label: string;
  status: 'done' | 'current' | 'pending' | 'returned';
}

export function getWorkflowSteps(work: Work): WorkflowStep[] {
  let labels: string[] = [];

  if (work.type === '待办') {
    const companyCreated =
      work.creator_role === 'vice_president' ||
      work.creator_role === 'president';

    labels = companyCreated
      ? ['公司领导提出', '部门分解', '提出领导审批', '进行中', '完成审批', '已完成']
      : ['部门发起并分解', '部门领导审批', '提出领导审批', '进行中', '完成审批', '已完成'];
  } else {
    labels = ['部门提交', '部门领导审批', '公司主管领导审批', '进行中', '完成审批', '已完成'];
  }

  let currentIndex = 0;

  if (work.status === 'submitted') currentIndex = 1;
  else if (work.status === 'todo_pending_decompose') currentIndex = 1;
  else if (work.status === 'dept_approved' || work.status === 'canceling' || work.status === 'ceo_pending_cancel') currentIndex = 2;
  else if (work.status === 'active' || work.status === 'company_approved') currentIndex = 3;
  else if (work.status === 'material_submitted') currentIndex = 4;
  else if (work.status === 'completed') currentIndex = labels.length - 1;
  else if (isReturnStatus(work.status)) currentIndex = Math.max(0, labels.length - 2);
  else if (work.status === 'cancelled') currentIndex = labels.length - 1;

  return labels.map((label, index) => {
    if (isReturnStatus(work.status) && index === currentIndex) {
      return { label: `${label}（退回待处理）`, status: 'returned' };
    }

    if (index < currentIndex) {
      return { label, status: 'done' };
    }

    if (index === currentIndex) {
      return { label, status: 'current' };
    }

    return { label, status: 'pending' };
  });
}