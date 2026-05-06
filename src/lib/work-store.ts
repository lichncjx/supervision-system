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
  | 'pending_dept'
  | 'pending_company'
  | 'approved'
  | 'in_progress'
  | 'pending_decompose'
  | 'pending_complete'
  | 'pending_evidence_dept'
  | 'pending_evidence_company'
  | 'pending_main_leader_cancel'
  | 'completed'
  | 'rejected'
  | 'adjusting'
  | 'cancelling'
  | 'cancelled';

export type ActionType =
  | 'create'
  | 'complete'
  | 'adjust'
  | 'cancel'
  | 'todo_decompose';

function normalizeAction(action: unknown): ActionType {
  const normalized = typeof action === 'string' ? action.toLowerCase() : '';
  if (normalized === 'complete') return 'complete';
  if (normalized === 'adjust') return 'adjust';
  if (normalized === 'cancel') return 'cancel';
  if (normalized === 'todo_decompose') return 'todo_decompose';
  return 'create';
}

export interface WorkSubNode {
  id: number;
  title: string;
  completeTime?: string;
}

export interface WorkNode {
  id: number;
  title: string;
  completeTime?: string;
  children: WorkSubNode[];
}

export interface ProofFile {
  id: number;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  userId: number;
  userName?: string;
}

export interface AdjustHistory {
  id: number;
  reason: string;
  field: 'completeTime' | 'planCompleteTime';
  fromTime?: string;
  toTime?: string;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Work {
  id: number;
  title: string;
  description?: string;
  type: WorkType;
  departmentId?: number;
  departmentName?: string;
  creatorRole: string;
  creatorId?: number;
  creatorName?: string;
  status: Status;
  action: ActionType;
  needCeo: boolean;
  proof?: string;
  proofFiles?: ProofFile[];
  adjustReason?: string;
  cancelReason?: string;
  adjustNewTime?: string;
  adjustTimeType?: 'completeTime' | 'planCompleteTime';
  createdAt: string;
  updatedAt: string;
  isInnovation?: boolean;
  nodes?: WorkNode[];
  businessCategory?: string;
  workItem?: string;
  workNode?: string;
  completeTime?: string;
  completeForm?: string;
  responsibleLeader?: string;
  supervisor?: string;
  proposedLeader?: string;
  proposedLeaderId?: number;
  proposedLeaderRole?: string;
  proposedScene?: string;
  formedTime?: string;
  responsiblePerson?: string;
  cooperateDepartment?: string;
  cooperatePerson?: string;
  departmentIds?: number[];
  responsiblePersons?: string[];
  cooperateDepartmentIds?: number[];
  cooperateDepartments?: string[];
  cooperatePersons?: string[];
  workPlan?: string;
  planCompleteTime?: string;
  progress?: string;
  rejectReason?: string | null;
  rejectedAt?: string;
  rejectedFrom?: Status;
  rejectedFromStatus?: Status | null;
  rejectedBy?: string;
  adjustHistory?: AdjustHistory[];
  approvalLeader?: string;
  approvalLeaderId?: number;
  approvalLeaderRole?: string;
  currentApproverId?: number;
  currentApproverRole?: string;
  firstSubmitterId?: number;
  pendingAdjustment?: WorkEditablePatch;
  pendingAdjustmentReason?: string;
  pendingAdjustmentFromTime?: string;
  pendingAdjustmentToTime?: string;
  attachments?: Attachment[];
}

export type WorkEditablePatch = Partial<Pick<
  Work,
  | 'title'
  | 'description'
  | 'businessCategory'
  | 'workItem'
  | 'workNode'
  | 'nodes'
  | 'isInnovation'
  | 'completeTime'
  | 'completeForm'
  | 'departmentId'
  | 'departmentIds'
  | 'responsibleLeader'
  | 'supervisor'
  | 'proposedLeader'
  | 'proposedLeaderId'
  | 'proposedLeaderRole'
  | 'proposedScene'
  | 'formedTime'
  | 'responsiblePerson'
  | 'responsiblePersons'
  | 'cooperateDepartment'
  | 'cooperatePerson'
  | 'cooperateDepartmentIds'
  | 'cooperateDepartments'
  | 'cooperatePersons'
  | 'workPlan'
  | 'planCompleteTime'
  | 'progress'
  | 'approvalLeader'
  | 'approvalLeaderId'
  | 'approvalLeaderRole'
>>;

export function transformWorkFromAPI(work: any): Work {
  // 提取对象字段的字符串表示
  const extractName = (obj: any): string => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object' && obj.name) return obj.name;
    return '';
  };

  // 提取对象数组的字符串数组
  const extractNameArray = (arr: any): string[] => {
    if (!arr) return [];
    if (Array.isArray(arr)) {
      return arr.map((item: any) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item.name) return item.name;
        return String(item);
      }).filter(Boolean);
    }
    return [];
  };

  return {
    id: work.id,
    title: work.title,
    type: work.type as WorkType,
    departmentId: work.departmentId,
    departmentName: work.departmentName,
    creatorRole: work.creatorRole || work.creator_role || '',
    creatorId: work.creatorId || work.creator_id,
    creatorName: work.creatorName,
    status: work.status?.toLowerCase() as Status || 'draft',
    action: normalizeAction(work.action || work.action_type),
    needCeo: work.type === '重点',
    isInnovation: work.isInnovation || work.is_innovation,
    nodes: work.nodes || [],
    businessCategory: work.businessCategory || work.business_category,
    workItem: work.workItem || work.work_item,
    workNode: work.workNode || work.work_node,
    completeTime: work.completeTime || work.complete_time,
    completeForm: work.completeForm || work.complete_form,
    responsibleLeader: work.responsibleLeader || work.responsible_leader,
    supervisor: work.supervisor,
    proposedLeader: extractName(work.proposedLeader),
    proposedLeaderId: work.proposedLeaderId || work.proposed_leader_id,
    proposedLeaderRole: work.proposedLeaderRole || work.proposed_leader_role,
    proposedScene: work.proposedScene || work.proposed_scene,
    formedTime: work.formedTime || work.formed_time,
    departmentIds: work.departmentIds || work.department_ids || [],
    responsiblePersons: extractNameArray(work.responsiblePersons || work.responsible_persons),
    cooperateDepartmentIds: work.cooperateDepartmentIds || work.cooperate_department_ids || [],
    cooperatePersons: extractNameArray(work.cooperatePersons || work.cooperate_persons),
    workPlan: work.workPlan || work.work_plan,
    planCompleteTime: work.planCompleteTime || work.plan_complete_time,
    progress: work.progress,
    approvalLeaderId: work.approvalLeaderId || work.approval_leader_id,
    createdAt: work.createdAt || work.created_at,
    updatedAt: work.updatedAt || work.updated_at,
    rejectReason: work.rejectReason || work.reject_reason,
    rejectedAt: work.rejectedAt || work.rejected_at,
    rejectedFrom: work.rejectedFrom || work.rejected_from_status,
    adjustReason: work.adjustReason || work.adjust_reason,
    cancelReason: work.cancelReason || work.cancel_reason,
    currentApproverId: work.currentApproverId || work.current_approver_id,
    currentApproverRole: work.currentApproverRole || work.current_approver_role,
    firstSubmitterId: work.firstSubmitterId ?? undefined,
    attachments: work.attachments || [],
  };
}

export async function getWorks(): Promise<Work[]> {
  try {
    const response = await fetch('/api/works', { credentials: 'include' });
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.map(transformWorkFromAPI);
  } catch {
    return [];
  }
}

function isCompanyVisibleWork(work: Work) {
  if (work.type !== '重点' && work.type !== '主要') {
    return true;
  }

  const companyVisibleStatuses: Status[] = [
    'pending_company',
    'approved',
    'in_progress',
    'adjusting',
    'cancelling',
    'pending_main_leader_cancel',
    'completed',
    'rejected',
    'cancelled',
  ];

  return companyVisibleStatuses.includes(work.status);
}

export async function getVisibleWorks(user: User | null | undefined, type?: WorkType): Promise<Work[]> {
  const works = await getWorks();

  let list = works;

  if (type) {
    list = list.filter((w) => w.type === type);
  }

  if (!user) return [];

  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
    return sortWorksByDueDate(list);
  }

  if (isCompanyLevel(user.role, user.departmentId)) {
    return sortWorksByDueDate(list.filter((w) => isCompanyVisibleWork(w)));
  }

  return sortWorksByDueDate(
    list.filter((w) => isWorkRelatedToDepartment(w, user.departmentId))
  );
}

export async function getWorkById(id: number): Promise<Work | undefined> {
  try {
    const response = await fetch(`/api/works/${id}`, { credentials: 'include' });
    if (!response.ok) {
      return undefined;
    }
    const data = await response.json();
    return transformWorkFromAPI(data);
  } catch {
    return undefined;
  }
}

export async function queryWorks(user: User | null | undefined, query: WorkQuery): Promise<Work[]> {
  let list = await getVisibleWorks(user);

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
        w.workItem,
        w.description,
        w.businessCategory,
        w.proposedLeader,
        w.proposedScene,
        w.responsibleLeader,
        w.supervisor,
        w.responsiblePerson,
        w.progress,
        w.workPlan,
      ]
        .filter(Boolean)
        .some((v) => String(v).includes(keyword))
    );
  }

  return sortWorksByDueDate(list);
}

export async function addWork(work: Omit<Work, 'createdAt' | 'updatedAt'>): Promise<Work> {
  const data: any = {
    type: work.type,
    title: work.title,
    departmentId: work.departmentId,
    workItem: work.workItem,
    workNode: work.workNode,
    businessCategory: work.businessCategory,
    completeTime: work.completeTime,
    completeForm: work.completeForm,
    isInnovation: work.isInnovation,
    responsibleLeader: work.responsibleLeader,
    supervisor: work.supervisor,
    proposedLeader: work.proposedLeader,
    proposedLeaderId: work.proposedLeaderId,
    proposedScene: work.proposedScene,
    formedTime: work.formedTime,
    departmentIds: work.departmentIds,
    responsiblePersons: work.responsiblePersons,
    cooperateDepartmentIds: work.cooperateDepartmentIds,
    cooperatePersons: work.cooperatePersons,
    workPlan: work.workPlan,
    planCompleteTime: work.planCompleteTime,
    progress: work.progress,
    approvalLeaderId: work.approvalLeaderId,
    nodes: work.nodes,
  };

  const response = await fetch('/api/works', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建失败');
  }

  const result = await response.json();
  return transformWorkFromAPI(result);
}

export async function updateWork(id: number, patch: Partial<Work>): Promise<Work | undefined> {
  const data: any = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.workItem !== undefined) data.workItem = patch.workItem;
  if (patch.workNode !== undefined) data.workNode = patch.workNode;
  if (patch.businessCategory !== undefined) data.businessCategory = patch.businessCategory;
  if (patch.completeTime !== undefined) data.completeTime = patch.completeTime;
  if (patch.completeForm !== undefined) data.completeForm = patch.completeForm;
  if (patch.isInnovation !== undefined) data.isInnovation = patch.isInnovation;
  if (patch.responsibleLeader !== undefined) data.responsibleLeader = patch.responsibleLeader;
  if (patch.supervisor !== undefined) data.supervisor = patch.supervisor;
  if (patch.proposedLeader !== undefined) data.proposedLeader = patch.proposedLeader;
  if (patch.proposedLeaderId !== undefined) data.proposedLeaderId = patch.proposedLeaderId;
  if (patch.proposedScene !== undefined) data.proposedScene = patch.proposedScene;
  if (patch.formedTime !== undefined) data.formedTime = patch.formedTime;
  if (patch.responsiblePersons !== undefined) data.responsiblePersons = patch.responsiblePersons;
  if (patch.cooperateDepartmentIds !== undefined) data.cooperateDepartmentIds = patch.cooperateDepartmentIds;
  if (patch.cooperatePersons !== undefined) data.cooperatePersons = patch.cooperatePersons;
  if (patch.workPlan !== undefined) data.workPlan = patch.workPlan;
  if (patch.planCompleteTime !== undefined) data.planCompleteTime = patch.planCompleteTime;
  if (patch.progress !== undefined) data.progress = patch.progress;
  if (patch.approvalLeaderId !== undefined) data.approvalLeaderId = patch.approvalLeaderId;
  if (patch.nodes !== undefined) data.nodes = patch.nodes;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.rejectReason !== undefined) data.rejectReason = patch.rejectReason;
  if (patch.rejectedFromStatus !== undefined) data.rejectedFromStatus = patch.rejectedFromStatus;

  const response = await fetch(`/api/works/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '修改失败');
  }

  const result = await response.json();
  return transformWorkFromAPI(result);
}

export async function deleteWork(id: number): Promise<void> {
  const response = await fetch(`/api/works/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '删除失败');
  }
}

export async function resubmitRejectedWork(work: Work, user: User, patch: WorkEditablePatch) {
  // Step 1: Update content fields (keep status as REJECTED)
  await updateWork(work.id, {
    ...patch,
    title: patch.title || patch.workItem || work.title,
  });

  // Step 2: Submit via workflow API to re-enter the approval chain
  const response = await fetch(`/api/works/${work.id}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action: 'submit', comment: '修改后重新提交审批' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '重新提交失败');
  }

  return await getWorkById(work.id);
}


export function getStatusName(status: string) {
  const normalized = status.toLowerCase();
  const map: Record<string, string> = {
    draft: '草稿',
    pending_dept: '待部门审批',
    pending_company: '待公司审批',
    approved: '已审批',
    in_progress: '进行中',
    pending_decompose: '待分解',
    pending_complete: '待完成',
    pending_evidence_dept: '待部门见证审批',
    pending_evidence_company: '待公司见证审批',
    pending_main_leader_cancel: '待一把手审批取消',
    completed: '已完成',
    rejected: '已退回',
    adjusting: '调整审批中',
    cancelling: '取消审批中',
    cancelled: '已取消',
  };
  return map[normalized] || status;
}

export function getActionName(action: string) {
  const map: Record<string, string> = {
    create: '新建审批',
    submit: '提交审批',
    approve: '审批通过',
    reject: '审批退回',
    evidence: '提交见证材料',
    complete: '完成审批',
    adjust: '申请调整',
    cancel: '申请取消',
    todo_decompose: '待办分解审批',
    decompose: '待办分解审批',
  };
  return map[action] || action;
}

export function getCurrentProcessDescription(
  status: string,
  currentApproverRole?: string | null,
  currentApproverId?: number | null
): string {
  const normalizedStatus = status.toLowerCase();
  const normalizedRole = currentApproverRole?.toUpperCase();

  if (normalizedRole === 'DEPARTMENT_LEADER') {
    switch (normalizedStatus) {
      case 'adjusting':
        return '调整申请待部门领导审批';
      case 'cancelling':
        return '取消申请待部门领导审批';
      default:
        break;
    }
  }

  if (normalizedRole === 'VICE_PRESIDENT') {
    switch (normalizedStatus) {
      case 'adjusting':
        return '调整申请待公司主管领导审批';
      case 'cancelling':
        return '取消申请待公司主管领导审批';
      default:
        break;
    }
  }

  if (currentApproverId) {
    switch (normalizedStatus) {
      case 'pending_company':
        return '待指定公司领导审批';
      case 'adjusting':
        return '调整申请待指定公司领导审批';
      case 'cancelling':
        return '取消申请待指定公司领导审批';
      case 'pending_complete':
        return '完成申请待指定公司领导审批';
      default:
        break;
    }
  }

  const statusMap: Record<string, string> = {
    draft: '草稿，待提交',
    pending_dept: '待部门领导审批',
    pending_company: '待公司主管领导审批',
    approved: '已立项，待上传见证材料',
    in_progress: '进行中',
    pending_evidence_dept: '见证材料待部门领导审批',
    pending_evidence_company: '见证材料待公司主管领导审批',
    pending_complete: '完成申请待公司领导审批',
    adjusting: '调整审批中',
    cancelling: '取消审批中',
    pending_main_leader_cancel: '重点工作取消申请待公司主要领导审批',
    completed: '已完成',
    cancelled: '已取消',
    rejected: '已退回，待修改后重新提交',
    pending_decompose: '待分解',
  };

  return statusMap[normalizedStatus] || status;
}

export function getWorkflowRecordDescription(
  action: string,
  previousStatus: string,
  newStatus: string
): string {
  const normalizedAction = action.toLowerCase();
  const normalizedOldStatus = previousStatus.toLowerCase();
  const normalizedNewStatus = newStatus.toLowerCase();

  if (normalizedAction === 'reject') {
    return '审批退回，待修改后重新提交';
  }

  if (normalizedAction === 'adjust') {
    return '提交调整申请，进入调整审批流程';
  }

  if (normalizedAction === 'cancel') {
    return '提交取消申请，进入取消审批流程';
  }

  if (normalizedAction === 'evidence') {
    if (normalizedNewStatus === 'pending_complete') {
      return '提交完成申请，进入完成审批流程';
    }
    return '提交见证材料';
  }

  if (normalizedAction === 'submit') {
    return '提交审批申请';
  }

  if (normalizedAction === 'approve') {
    if (normalizedOldStatus === 'adjusting') {
      if (normalizedNewStatus === 'adjusting') {
        return '调整申请审批通过，继续流转至下一审批节点';
      }
      if (normalizedNewStatus === 'in_progress') {
        return '调整申请审批通过，事项恢复进行中';
      }
    }

    if (normalizedOldStatus === 'cancelling') {
      if (normalizedNewStatus === 'cancelling') {
        return '取消申请审批通过，继续流转至下一审批节点';
      }
      if (normalizedNewStatus === 'pending_main_leader_cancel') {
        return '公司主管领导审批通过，流转至公司主要领导审批';
      }
      if (normalizedNewStatus === 'cancelled') {
        return '取消申请审批通过，事项已取消';
      }
    }

    if (normalizedOldStatus === 'pending_main_leader_cancel') {
      if (normalizedNewStatus === 'cancelled') {
        return '公司主要领导审批通过，取消申请生效，事项已取消';
      }
    }

    if (normalizedOldStatus === normalizedNewStatus) {
      return '审批通过，流程继续流转';
    }

    const statusChangeDesc: Record<string, Record<string, string>> = {
      draft: {
        pending_dept: '提交审批，流转至部门领导审批',
        pending_company: '提交审批，流转至公司领导审批',
      },
      pending_dept: {
        pending_company: '部门领导审批通过，流转至公司领导审批',
        rejected: '部门领导审批退回',
      },
      pending_company: {
        approved: '公司领导审批通过，事项已立项',
        in_progress: '公司领导审批通过，事项进入进行中',
        rejected: '公司领导审批退回',
      },
      approved: {
        pending_evidence_dept: '提交见证材料，待部门领导审批',
        in_progress: '进入执行阶段',
      },
      in_progress: {
        pending_complete: '提交完成申请',
      },
      pending_evidence_dept: {
        pending_evidence_company: '部门领导审批通过，流转至公司领导审批',
        approved: '部门领导审批通过',
      },
      pending_evidence_company: {
        completed: '公司领导审批通过，事项已完成',
      },
      pending_complete: {
        completed: '完成审批通过，事项已完成',
      },
    };

    if (statusChangeDesc[normalizedOldStatus]?.[normalizedNewStatus]) {
      return statusChangeDesc[normalizedOldStatus][normalizedNewStatus];
    }

    return `审批通过，状态变更`;
  }

  if (normalizedAction === 'decompose') {
    return '待办事项已分解';
  }

  return '';
}

export function isPendingStatus(status: Status) {
  return isPendingApprovalStatus(status);
}

export function isInProgressStatus(status: Status) {
  return [
    'in_progress',
    'approved',
    'adjusting',
    'cancelling',
  ].includes(status);
}

export function getWorkDueDate(work: Work) {
  return work.completeTime || work.planCompleteTime || '';
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
  addId(work.departmentId);
  if (Array.isArray(work.departmentIds)) {
    work.departmentIds.forEach(addId);
  }
  if (Array.isArray(work.cooperateDepartmentIds)) {
    work.cooperateDepartmentIds.forEach(addId);
  }
  return Array.from(ids);
}

function isWorkRelatedToDepartment(work: Work, departmentId?: number) {
  if (!departmentId) return false;
  return getWorkDepartmentIds(work).includes(Number(departmentId));
}

export function isReturnStatus(status: Status) {
  return [
    'rejected',
  ].includes(status);
}

export function isPendingApprovalStatus(status: Status) {
  return [
    'pending_dept',
    'pending_company',
    'pending_evidence_dept',
    'pending_evidence_company',
    'cancelling',
    'pending_main_leader_cancel',
  ].includes(status);
}

export function isSupervisorTrackingWork(work: Work) {
  const trackingStatuses: Status[] = [
    'pending_dept',
    'pending_company',
    'pending_decompose',
    'pending_evidence_dept',
    'pending_evidence_company',
    'rejected',
    'adjusting',
    'cancelling',
    'pending_main_leader_cancel',
  ];

  return trackingStatuses.includes(work.status);
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

export async function getFilteredWorks(user: User | null | undefined, filter: WorkFilter): Promise<Work[]> {
  const list = await getVisibleWorks(user);

  if (filter === 'all') return list;
  if (filter === 'pending') return list.filter((w) => isPendingStatus(w.status));
  if (filter === 'inProgress') return list.filter((w) => isInProgressStatus(w.status));
  if (filter === 'completed') return list.filter((w) => w.status === 'completed');
  if (filter === 'overdue') return list.filter((w) => isOverdueWork(w));

  return list;
}

export function canHandleWork(user: User | null | undefined, work: Work) {
  if (!user) return false;

  if (user.role === 'SUPERVISOR') {
    return false;
  }

  if (user.role === 'ADMIN') {
    return false;
  }

  // 本人创建的草稿
  if (work.status === 'draft' && work.creatorId === user.id) {
    return true;
  }

  // 被退回后，仅首次提交审批人可以处理
  // firstSubmitterId ?? creatorId 的 fallback 仅用于兼容历史数据
  if (isReturnStatus(work.status)) {
    const submitterId = work.firstSubmitterId ?? work.creatorId;
    return submitterId === user.id;
  }

  // 待办事项待分解
  if (
    work.type === '待办' &&
    work.status === 'pending_decompose' &&
    (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
    isWorkRelatedToDepartment(work, user.departmentId)
  ) {
    return true;
  }

  // 重点/主要工作已立项，待责任部门上传见证材料
  if (
    (work.type === '重点' || work.type === '主要') &&
    work.status === 'approved' &&
    (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
    isWorkRelatedToDepartment(work, user.departmentId)
  ) {
    return true;
  }

  // 待办事项进行中，待责任部门提交完成材料
  if (
    work.type === '待办' &&
    work.status === 'in_progress' &&
    (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
    isWorkRelatedToDepartment(work, user.departmentId)
  ) {
    return true;
  }

  return false;
}

export function canProcessWork(user: User | null | undefined, work: Work) {
  return canApproveWork(user, work) || canHandleWork(user, work);
}

export function canApproveWork(user: User | null | undefined, work: Work) {
  if (!user) return false;

  const pendingStatuses: Status[] = [
    'pending_dept',
    'pending_company',
    'pending_evidence_dept',
    'pending_evidence_company',
    'cancelling',
    'pending_main_leader_cancel',
    'adjusting',
  ];

  if (!pendingStatuses.includes(work.status)) {
    return false;
  }

  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
    return false;
  }

  if (user.role === 'DEPARTMENT_LEADER') {
    return (
      isWorkRelatedToDepartment(work, user.departmentId) &&
      (
        work.status === 'pending_dept' ||
        work.status === 'pending_evidence_dept' ||
        work.status === 'adjusting' ||
        work.status === 'cancelling'
      )
    );
  }

  if (work.status === 'pending_company' || work.status === 'pending_evidence_company') {
    return isSelectedCompanyApprover(user, work);
  }

  if (work.status === 'cancelling' || work.status === 'adjusting') {
    return isSelectedCompanyApprover(user, work);
  }

  if (work.status === 'pending_main_leader_cancel') {
    return user.role === 'PRESIDENT';
  }

  return false;
}

function isSelectedCompanyApprover(user: User, work: Work) {
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
    return false;
  }

  if (work.currentApproverId) {
    return work.currentApproverId === user.id;
  }

  if (work.currentApproverRole) {
    return work.currentApproverRole === user.role;
  }

  if (
    (work.action === 'adjust' || work.action === 'cancel') &&
    work.approvalLeaderId
  ) {
    return work.approvalLeaderId === user.id;
  }

  if (work.type === '待办' && work.status === 'pending_company' && work.proposedLeaderId) {
    return work.proposedLeaderId === user.id;
  }

  if (
    (work.type === '重点' || work.type === '主要') &&
    (work.status === 'pending_company' || work.status === 'pending_evidence_company')
  ) {
    return user.role === 'VICE_PRESIDENT';
  }

  return false;
}

export async function approveWork(user: User, work: Work) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'approve' }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '审批失败');
    }
    return await getWorkById(work.id);
  } catch (error) {
    console.error('Approve work error:', error);
    throw error;
  }
}

export async function rejectWork(work: Work, user: User, reason = '审批退回') {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'reject', rejectReason: reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '退回失败');
    }
    return await getWorkById(work.id);
  } catch (error) {
    console.error('Reject work error:', error);
    throw error;
  }
}

export async function submitComplete(work: Work, user: User, proof: string, _proofFiles?: ProofFile[]) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'evidence', proof, comment: '提交完成' }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '提交失败');
    }
    return await getWorkById(work.id);
  } catch (error) {
    console.error('Submit complete error:', error);
    throw error;
  }
}

export async function submitAdjust(work: Work, user: User, reason: string, _pendingAdjustment?: WorkEditablePatch) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'adjust', adjustReason: reason, comment: '申请调整' }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '申请调整失败');
    }
    return await getWorkById(work.id);
  } catch (error) {
    console.error('Submit adjust error:', error);
    throw error;
  }
}

export async function submitCancel(work: Work, user: User, reason: string) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'cancel', cancelReason: reason, comment: '申请取消' }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '申请取消失败');
    }
    return await getWorkById(work.id);
  } catch (error) {
    console.error('Submit cancel error:', error);
    throw error;
  }
}

export async function submitWork(work: Work, _user: User) {
  try {
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'submit', comment: '提交审批' }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '提交审批失败');
    }
    return await getWorkById(work.id);
  } catch (error) {
    console.error('Submit work error:', error);
    throw error;
  }
}

export async function submitTodoDecomposition(work: Work, user: User, patch: WorkEditablePatch) {
  try {
    const nodes = patch.nodes || [];
    const response = await fetch(`/api/works/${work.id}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'decompose', nodes, comment: '待办分解' }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '分解失败');
    }
    return await getWorkById(work.id);
  } catch (error) {
    console.error('Submit todo decomposition error:', error);
    throw error;
  }
}

export async function getStats(user: User | null | undefined) {
  const list = await getVisibleWorks(user);

  const pendingHandleList =
    user?.role === 'SUPERVISOR'
      ? list.filter((w) => isSupervisorTrackingWork(w))
      : list.filter((w) => canHandleWork(user, w));

  return {
    total: list.length,
    pendingApproval: list.filter((w) => isPendingStatus(w.status)).length,
    inProgress: list.filter((w) => isInProgressStatus(w.status)).length,
    completed: list.filter((w) => w.status === 'completed').length,
    expired: list.filter((w) => isOverdueWork(w)).length,
    expiring: list.filter((w) => isExpiringWork(w)).length,
    priority: list.filter((w) => w.type === '重点').length,
    main: list.filter((w) => w.type === '主要').length,
    todo: list.filter((w) => w.type === '待办').length,
    pendingHandle: pendingHandleList.length,
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
      work.creatorRole === 'VICE_PRESIDENT' ||
      work.creatorRole === 'PRESIDENT';

    labels = companyCreated
      ? ['公司领导提出', '部门分解', '提出领导审批', '进行中', '完成审批', '已完成']
      : ['部门发起并分解', '部门领导审批', '提出领导审批', '进行中', '完成审批', '已完成'];
  } else {
    labels = ['部门提交', '部门领导审批', '公司主管领导审批', '进行中', '完成审批', '已完成'];
  }

  let currentIndex = 0;

  if (work.status === 'pending_dept') currentIndex = 1;
  else if (work.status === 'pending_decompose') currentIndex = 1;
  else if (work.status === 'pending_company' || work.status === 'cancelling' || work.status === 'pending_main_leader_cancel') currentIndex = 2;
  else if (work.status === 'in_progress' || work.status === 'approved') currentIndex = 3;
  else if (work.status === 'pending_evidence_dept' || work.status === 'pending_evidence_company') currentIndex = 4;
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

export interface WorkflowRecord {
  id: number;
  action: string;
  initiatorId: number;
  initiatorName: string;
  initiatorRole: string;
  previousStatus: string;
  newStatus: string;
  comment: string;
  createdAt: string;
}

export async function getWorkflowRecords(workId: number): Promise<WorkflowRecord[]> {
  try {
    const response = await fetch(`/api/works/${workId}/workflow`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('获取审批记录失败');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取审批记录失败:', error);
    return [];
  }
}
