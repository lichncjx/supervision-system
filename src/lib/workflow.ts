import {
  ActionType,
  ApprovalType,
  Prisma,
  Role,
  WorkItemStatus,
  WorkItemType,
} from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  canApproveWorkItem,
  canHandleWorkItem,
  isWorkMainResponsibleDepartment,
  type PermissionWorkItem,
} from '@/lib/server-permissions';

export interface UserSession {
  userId: number;
  userName: string;
  role: Role;
  departmentId: number;
}

export interface WorkflowResult {
  success: boolean;
  workItem?: any;
  error?: string;
}

type WorkflowWorkItem = NonNullable<Awaited<ReturnType<typeof findWorkItem>>>;

interface ApproverAssignment {
  currentApproverId: number | null;
  currentApproverRole: Role | null;
}

const APPROVAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
];

const APPROVAL_TARGET_STATUS: Record<ApprovalType, WorkItemStatus> = {
  [ApprovalType.PROPOSE]: WorkItemStatus.IN_PROGRESS,
  [ApprovalType.ADJUST]: WorkItemStatus.IN_PROGRESS,
  [ApprovalType.CANCEL]: WorkItemStatus.CANCELLED,
  [ApprovalType.COMPLETE]: WorkItemStatus.COMPLETED,
};

function toPermissionUser(user: UserSession) {
  return {
    id: user.userId,
    role: user.role,
    departmentId: user.departmentId,
  };
}

function isApprovalStatus(status: WorkItemStatus) {
  return APPROVAL_STATUSES.includes(status);
}

function isDepartmentRole(role: Role) {
  return role === Role.DEPARTMENT_MANAGER || role === Role.DEPARTMENT_LEADER;
}

function isCompanyLeaderRole(role: Role) {
  return role === Role.VICE_PRESIDENT || role === Role.PRESIDENT;
}

async function findWorkItem(workItemId: number) {
  return prisma.workItem.findUnique({
    where: { id: workItemId },
  });
}

async function getWorkItem(workItemId: number): Promise<WorkflowWorkItem | null> {
  return findWorkItem(workItemId);
}

async function createWorkflowRecord(
  workItemId: number,
  actionType: string,
  operatorId: number,
  _operatorName: string,
  operatorRole: Role,
  statusBefore: WorkItemStatus,
  statusAfter: WorkItemStatus,
  comment?: string,
) {
  return prisma.workflowRecord.create({
    data: {
      workItemId,
      actionType,
      initiatorId: operatorId,
      approvalRole: operatorRole,
      statusBefore,
      statusAfter,
      comment,
    },
  });
}

async function logOperation(
  userId: number,
  userName: string,
  userRole: Role,
  operationType: string,
  module: string,
  description: string,
  targetId?: number,
) {
  return prisma.operationLog.create({
    data: {
      userId,
      userName,
      userRole,
      action: operationType,
      module,
      description,
      targetId,
      targetType: 'workItem',
    },
  });
}

function departmentLeaderAssignment(): ApproverAssignment {
  return {
    currentApproverId: null,
    currentApproverRole: Role.DEPARTMENT_LEADER,
  };
}

function companyLeaderAssignment(
  workItem: WorkflowWorkItem,
  source: 'propose' | 'approval' = 'approval',
): ApproverAssignment {
  const leaderId =
    source === 'propose'
      ? workItem.proposedLeaderId ?? workItem.approvalLeaderId
      : workItem.approvalLeaderId ?? workItem.proposedLeaderId;

  return {
    currentApproverId: leaderId ?? null,
    currentApproverRole: Role.VICE_PRESIDENT,
  };
}

async function presidentAssignment(): Promise<ApproverAssignment> {
  const president = await prisma.user.findFirst({
    where: {
      role: Role.PRESIDENT,
      isActive: true,
    },
    orderBy: { id: 'asc' },
    select: { id: true },
  });

  return {
    currentApproverId: president?.id ?? null,
    currentApproverRole: Role.PRESIDENT,
  };
}

function getProposalFirstApprover(workItem: WorkflowWorkItem, user: UserSession): ApproverAssignment {
  if (user.role === Role.DEPARTMENT_MANAGER) {
    return departmentLeaderAssignment();
  }

  if (user.role === Role.DEPARTMENT_LEADER) {
    return companyLeaderAssignment(workItem, 'propose');
  }

  if (isCompanyLeaderRole(user.role)) {
    return companyLeaderAssignment(workItem, 'propose');
  }

  return departmentLeaderAssignment();
}

function getProcessFirstApprover(workItem: WorkflowWorkItem, user: UserSession): ApproverAssignment {
  if (user.role === Role.DEPARTMENT_MANAGER) {
    return departmentLeaderAssignment();
  }

  if (user.role === Role.DEPARTMENT_LEADER) {
    return companyLeaderAssignment(workItem, 'approval');
  }

  return companyLeaderAssignment(workItem, 'approval');
}

function shouldEscalateCancelToPresident(workItem: WorkflowWorkItem) {
  return workItem.type === WorkItemType.PRIORITY && workItem.needMainLeaderCancel === true;
}

function isDepartmentApprovalNode(workItem: WorkflowWorkItem) {
  return workItem.currentApproverRole === Role.DEPARTMENT_LEADER;
}

function isPresidentApprovalNode(workItem: WorkflowWorkItem) {
  return workItem.currentApproverRole === Role.PRESIDENT;
}

async function getNextApprovalAssignment(
  workItem: WorkflowWorkItem,
  approvalType: ApprovalType,
): Promise<ApproverAssignment | null> {
  if (approvalType === ApprovalType.PROPOSE) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'propose');
    }
    return null;
  }

  if (approvalType === ApprovalType.ADJUST || approvalType === ApprovalType.COMPLETE) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval');
    }
    return null;
  }

  if (approvalType === ApprovalType.CANCEL) {
    if (isDepartmentApprovalNode(workItem)) {
      return companyLeaderAssignment(workItem, 'approval');
    }

    if (shouldEscalateCancelToPresident(workItem) && !isPresidentApprovalNode(workItem)) {
      return presidentAssignment();
    }

    return null;
  }

  return null;
}

function canUserHandle(user: UserSession, workItem: PermissionWorkItem) {
  return canHandleWorkItem(toPermissionUser(user), workItem);
}

function canUserCancelDraft(user: UserSession, workItem: WorkflowWorkItem) {
  if (workItem.creatorId === user.userId) return true;
  if ((workItem.firstSubmitterId ?? workItem.creatorId) === user.userId) return true;
  return canUserHandle(user, workItem);
}

function ensureMainResponsibleDepartment(user: UserSession, workItem: WorkflowWorkItem) {
  return (
    isDepartmentRole(user.role) &&
    isWorkMainResponsibleDepartment(workItem, user.departmentId)
  );
}

function rejectableBeforeStatus(workItem: WorkflowWorkItem): WorkItemStatus | null {
  return workItem.beforeApprovalStatus ?? null;
}

export function canUserApprove(workItem: PermissionWorkItem, user: UserSession): boolean {
  return canApproveWorkItem(toPermissionUser(user), workItem);
}

export function canUserSubmit(workItem: PermissionWorkItem, user: UserSession): boolean {
  if (String(workItem.status).toUpperCase() !== WorkItemStatus.DRAFT) {
    return false;
  }

  if (workItem.creatorId === user.userId) return true;
  if ((workItem.firstSubmitterId ?? workItem.creatorId) === user.userId) return true;
  return canHandleWorkItem(toPermissionUser(user), workItem);
}

export async function submitForApproval(
  workItemId: number,
  user: UserSession,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await getWorkItem(workItemId);
  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (workItem.status !== WorkItemStatus.DRAFT) {
    return { success: false, error: '只有草稿事项可以提交审批' };
  }

  if (!canUserSubmit(workItem, user)) {
    return { success: false, error: '无权提交该事项' };
  }

  const oldStatus = workItem.status;

  if (
    workItem.type === WorkItemType.TODO &&
    (user.role === Role.VICE_PRESIDENT || user.role === Role.PRESIDENT)
  ) {
    const updated = await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        status: WorkItemStatus.PENDING_DECOMPOSE,
        action: ActionType.TODO_DECOMPOSE,
        beforeApprovalStatus: null,
        approvalType: null,
        currentApproverId: null,
        currentApproverRole: null,
        rejectReason: null,
        rejectedFromStatus: null,
      },
    });

    await createWorkflowRecord(
      workItemId,
      'submit',
      user.userId,
      user.userName,
      user.role,
      oldStatus,
      updated.status,
      comment || '提交待办分解',
    );
    await logOperation(user.userId, user.userName, user.role, 'submit', 'workflow', `提交事项: ${workItem.title}`, workItemId);

    return { success: true, workItem: updated };
  }

  const approver = getProposalFirstApprover(workItem, user);
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.PROPOSING,
      action: ActionType.CREATE,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.PROPOSE,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
      firstSubmitterId: workItem.firstSubmitterId ?? user.userId,
      rejectReason: null,
      rejectedFromStatus: null,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'submit',
    user.userId,
    user.userName,
    user.role,
    oldStatus,
    updated.status,
    comment || '提交审批',
  );
  await logOperation(user.userId, user.userName, user.role, 'submit', 'workflow', `提交事项: ${workItem.title}`, workItemId);

  return { success: true, workItem: updated };
}

export async function approveWorkItem(
  workItemId: number,
  user: UserSession,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await getWorkItem(workItemId);
  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (!isApprovalStatus(workItem.status)) {
    return { success: false, error: '当前状态不允许审批' };
  }

  if (!canApproveWorkItem(toPermissionUser(user), workItem)) {
    return { success: false, error: '无权审批该事项' };
  }

  if (!workItem.approvalType) {
    return { success: false, error: '审批类型缺失，无法继续流转' };
  }

  const oldStatus = workItem.status;
  const nextApprover = await getNextApprovalAssignment(workItem, workItem.approvalType);

  if (nextApprover) {
    const updated = await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        currentApproverId: nextApprover.currentApproverId,
        currentApproverRole: nextApprover.currentApproverRole,
      },
    });

    await createWorkflowRecord(
      workItemId,
      'approve',
      user.userId,
      user.userName,
      user.role,
      oldStatus,
      updated.status,
      comment || '审批通过，流转至下一节点',
    );
    await logOperation(user.userId, user.userName, user.role, 'approve', 'workflow', `审批通过: ${workItem.title}`, workItemId);

    return { success: true, workItem: updated };
  }

  const targetStatus = APPROVAL_TARGET_STATUS[workItem.approvalType];
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: targetStatus,
      beforeApprovalStatus: null,
      approvalType: null,
      currentApproverId: null,
      currentApproverRole: null,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'approve',
    user.userId,
    user.userName,
    user.role,
    oldStatus,
    updated.status,
    comment || '审批通过',
  );
  await logOperation(user.userId, user.userName, user.role, 'approve', 'workflow', `审批通过: ${workItem.title}`, workItemId);

  return { success: true, workItem: updated };
}

export async function rejectWorkItem(
  workItemId: number,
  user: UserSession,
  rejectReason: string,
): Promise<WorkflowResult> {
  const workItem = await getWorkItem(workItemId);
  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (!isApprovalStatus(workItem.status)) {
    return { success: false, error: '当前状态不允许退回' };
  }

  if (!canApproveWorkItem(toPermissionUser(user), workItem)) {
    return { success: false, error: '无权退回该事项' };
  }

  const targetStatus = rejectableBeforeStatus(workItem);
  if (!targetStatus) {
    return { success: false, error: '退回前状态缺失，无法退回' };
  }

  const oldStatus = workItem.status;
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: targetStatus,
      beforeApprovalStatus: null,
      approvalType: null,
      currentApproverId: null,
      currentApproverRole: null,
      rejectReason,
      rejectedFromStatus: oldStatus,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'reject',
    user.userId,
    user.userName,
    user.role,
    oldStatus,
    updated.status,
    rejectReason,
  );
  await logOperation(user.userId, user.userName, user.role, 'reject', 'workflow', `退回事项: ${workItem.title}`, workItemId);

  return { success: true, workItem: updated };
}

export async function submitEvidence(
  workItemId: number,
  user: UserSession,
  proof: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await getWorkItem(workItemId);
  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有进行中事项可以提交完成申请' };
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权提交完成申请' };
  }

  const oldStatus = workItem.status;
  const approver =
    workItem.type === WorkItemType.TODO
      ? companyLeaderAssignment(workItem, 'approval')
      : getProcessFirstApprover(workItem, user);

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.COMPLETING,
      action: ActionType.COMPLETE,
      proof,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.COMPLETE,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'evidence',
    user.userId,
    user.userName,
    user.role,
    oldStatus,
    updated.status,
    comment || '提交完成申请',
  );
  await logOperation(user.userId, user.userName, user.role, 'evidence', 'workflow', `提交完成申请: ${workItem.title}`, workItemId);

  return { success: true, workItem: updated };
}

export async function submitAdjust(
  workItemId: number,
  user: UserSession,
  adjustReason: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await getWorkItem(workItemId);
  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有进行中事项可以申请调整' };
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权申请调整' };
  }

  const oldStatus = workItem.status;
  const approver = getProcessFirstApprover(workItem, user);
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.ADJUSTING,
      action: ActionType.ADJUST,
      adjustReason,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.ADJUST,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'adjust',
    user.userId,
    user.userName,
    user.role,
    oldStatus,
    updated.status,
    comment || '申请调整',
  );
  await logOperation(user.userId, user.userName, user.role, 'adjust', 'workflow', `申请调整: ${workItem.title}`, workItemId);

  return { success: true, workItem: updated };
}

export async function submitCancel(
  workItemId: number,
  user: UserSession,
  cancelReason: string,
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await getWorkItem(workItemId);
  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (workItem.status === WorkItemStatus.DRAFT) {
    if (!canUserCancelDraft(user, workItem)) {
      return { success: false, error: '无权取消该草稿事项' };
    }

    const updated = await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        status: WorkItemStatus.CANCELLED,
        action: ActionType.CANCEL,
        cancelReason,
        beforeApprovalStatus: null,
        approvalType: null,
        currentApproverId: null,
        currentApproverRole: null,
      },
    });

    await createWorkflowRecord(
      workItemId,
      'cancel',
      user.userId,
      user.userName,
      user.role,
      workItem.status,
      updated.status,
      comment || '取消草稿事项',
    );
    await logOperation(user.userId, user.userName, user.role, 'cancel', 'workflow', `取消事项: ${workItem.title}`, workItemId);

    return { success: true, workItem: updated };
  }

  if (workItem.status !== WorkItemStatus.IN_PROGRESS) {
    return { success: false, error: '只有草稿或进行中事项可以申请取消' };
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权申请取消' };
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return { success: false, error: '只有主责部门可以申请取消' };
  }

  const oldStatus = workItem.status;
  const approver = getProcessFirstApprover(workItem, user);
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: WorkItemStatus.CANCELLING,
      action: ActionType.CANCEL,
      cancelReason,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.CANCEL,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'cancel',
    user.userId,
    user.userName,
    user.role,
    oldStatus,
    updated.status,
    comment || '申请取消',
  );
  await logOperation(user.userId, user.userName, user.role, 'cancel', 'workflow', `申请取消: ${workItem.title}`, workItemId);

  return { success: true, workItem: updated };
}

export async function decomposeTodo(
  workItemId: number,
  user: UserSession,
  nodes: any[],
  comment?: string,
): Promise<WorkflowResult> {
  const workItem = await getWorkItem(workItemId);
  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (workItem.type !== WorkItemType.TODO) {
    return { success: false, error: '只有待办事项可以分解' };
  }

  if (workItem.status !== WorkItemStatus.PENDING_DECOMPOSE) {
    return { success: false, error: '只有待分解事项可以提交分解方案' };
  }

  if (!canUserHandle(user, workItem)) {
    return { success: false, error: '无权分解该待办事项' };
  }

  if (!ensureMainResponsibleDepartment(user, workItem)) {
    return { success: false, error: '只有主责部门可以分解该待办事项' };
  }

  const oldStatus = workItem.status;
  const approver = getProposalFirstApprover(workItem, user);
  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      nodes: nodes as Prisma.InputJsonValue,
      status: WorkItemStatus.PROPOSING,
      action: ActionType.TODO_DECOMPOSE,
      beforeApprovalStatus: oldStatus,
      approvalType: ApprovalType.PROPOSE,
      currentApproverId: approver.currentApproverId,
      currentApproverRole: approver.currentApproverRole,
      firstSubmitterId: workItem.firstSubmitterId ?? user.userId,
      rejectReason: null,
      rejectedFromStatus: null,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'decompose',
    user.userId,
    user.userName,
    user.role,
    oldStatus,
    updated.status,
    comment || '提交待办分解方案',
  );
  await logOperation(user.userId, user.userName, user.role, 'decompose', 'workflow', `分解待办: ${workItem.title}`, workItemId);

  return { success: true, workItem: updated };
}

export async function getWorkflowRecords(workItemId: number) {
  const records = await prisma.workflowRecord.findMany({
    where: { workItemId },
    include: {
      initiator: {
        select: {
          name: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return records.map((record) => ({
    id: record.id,
    action: record.actionType,
    initiatorId: record.initiatorId,
    initiatorName: record.initiator?.name || '',
    initiatorRole: record.initiator?.role || record.approvalRole,
    previousStatus: record.statusBefore,
    newStatus: record.statusAfter,
    comment: record.comment,
    createdAt: record.createdAt,
  }));
}
