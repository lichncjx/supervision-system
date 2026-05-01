import { Role, WorkItemStatus, WorkItemType } from '@prisma/client';
import prisma from '@/lib/prisma';

export interface WorkflowResult {
  success: boolean;
  error?: string;
  workItem?: any;
}

export interface UserSession {
  userId: number;
  role: Role;
  departmentId: number;
}

export async function createWorkflowRecord(
  workItemId: number,
  actionType: string,
  initiatorId: number,
  statusBefore: WorkItemStatus,
  statusAfter: WorkItemStatus,
  approverId?: number,
  approverRole?: Role,
  comment?: string
) {
  return prisma.workflowRecord.create({
    data: {
      workItemId,
      actionType,
      initiatorId,
      approverId,
      approvalRole: approverRole,
      statusBefore,
      statusAfter,
      comment,
    },
  });
}

export async function logOperation(
  userId: number,
  userName: string,
  userRole: Role,
  action: string,
  targetId: number,
  description: string
) {
  return prisma.operationLog.create({
    data: {
      userId,
      userName,
      userRole,
      action,
      module: 'works',
      targetId,
      targetType: 'workItem',
      description,
    },
  });
}

export function canUserApprove(user: UserSession, workItem: any): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) {
    return false;
  }

  if (workItem.currentApproverId && workItem.currentApproverId === user.userId) {
    return true;
  }

  if (workItem.currentApproverRole && workItem.currentApproverRole === user.role) {
    if (user.role === Role.DEPARTMENT_LEADER) {
      return workItem.departmentId === user.departmentId;
    }
    return true;
  }

  return false;
}

export function canUserSubmit(user: UserSession, workItem: any): boolean {
  if (workItem.status !== WorkItemStatus.DRAFT && workItem.status !== WorkItemStatus.REJECTED) {
    return false;
  }

  if (workItem.creatorId !== user.userId) {
    return false;
  }

  return true;
}

export async function submitForApproval(workItemId: number, user: UserSession, comment?: string): Promise<WorkflowResult> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { creator: true },
  });

  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (!canUserSubmit(user, workItem)) {
    return { success: false, error: '无权提交此事项' };
  }

  let newStatus: WorkItemStatus = workItem.status;
  let newApproverRole: Role | undefined;
  let newApproverId: number | undefined;

  if (workItem.type === WorkItemType.TODO) {
    if (user.role === Role.VICE_PRESIDENT || user.role === Role.PRESIDENT) {
      newStatus = WorkItemStatus.PENDING_DECOMPOSE;
    } else if (user.role === Role.DEPARTMENT_MANAGER) {
      newStatus = WorkItemStatus.PENDING_DEPT;
      newApproverRole = Role.DEPARTMENT_LEADER;
    } else if (user.role === Role.DEPARTMENT_LEADER) {
      newStatus = WorkItemStatus.PENDING_COMPANY;
      newApproverId = workItem.approvalLeaderId || undefined;
      if (!newApproverId) {
        const leaders = await prisma.user.findMany({
          where: { role: { in: [Role.VICE_PRESIDENT, Role.PRESIDENT] }, isActive: true },
        });
        if (leaders.length > 0) {
          newApproverId = leaders[0].id;
        }
      }
    } else {
      return { success: false, error: '无权提交待办事项' };
    }
  } else {
    if (user.role === Role.DEPARTMENT_MANAGER) {
      newStatus = WorkItemStatus.PENDING_DEPT;
      newApproverRole = Role.DEPARTMENT_LEADER;
    } else if (user.role === Role.DEPARTMENT_LEADER) {
      newStatus = WorkItemStatus.PENDING_COMPANY;
      newApproverRole = Role.VICE_PRESIDENT;
    } else {
      return { success: false, error: '无权提交此类型事项' };
    }
  }

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: newStatus,
      currentApproverRole: newApproverRole,
      currentApproverId: newApproverId,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'submit',
    user.userId,
    workItem.status,
    newStatus,
    undefined,
    newApproverRole,
    comment
  );

  await logOperation(
    user.userId,
    workItem.creator.name,
    user.role,
    'submit',
    workItemId,
    `提交审批：${workItem.title}`
  );

  return { success: true, workItem: updated };
}

export async function approveWorkItem(workItemId: number, user: UserSession, comment?: string): Promise<WorkflowResult> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { creator: true },
  });

  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (!canUserApprove(user, workItem)) {
    return { success: false, error: '无权审批此事项' };
  }

  let newStatus: WorkItemStatus = workItem.status;
  let newApproverRole: Role | undefined;
  let newApproverId: number | undefined;

  if (workItem.status === WorkItemStatus.PENDING_DEPT) {
    if (workItem.type === WorkItemType.TODO) {
      newStatus = WorkItemStatus.PENDING_COMPANY;
      newApproverId = (workItem.proposedLeaderId ?? workItem.approvalLeaderId) ?? undefined;
    } else {
      newStatus = WorkItemStatus.PENDING_COMPANY;
      newApproverRole = Role.VICE_PRESIDENT;
    }
  } else if (workItem.status === WorkItemStatus.PENDING_COMPANY) {
    if (workItem.type === WorkItemType.TODO) {
      newStatus = WorkItemStatus.IN_PROGRESS;
      newApproverRole = undefined;
      newApproverId = undefined;
    } else {
      newStatus = WorkItemStatus.APPROVED;
      newApproverRole = undefined;
      newApproverId = undefined;
    }
  } else if (workItem.status === WorkItemStatus.PENDING_EVIDENCE_DEPT) {
    newStatus = WorkItemStatus.PENDING_EVIDENCE_COMPANY;
    newApproverRole = Role.VICE_PRESIDENT;
  } else if (workItem.status === WorkItemStatus.PENDING_EVIDENCE_COMPANY) {
    newStatus = WorkItemStatus.COMPLETED;
    newApproverRole = undefined;
    newApproverId = undefined;
  } else if (workItem.status === WorkItemStatus.ADJUSTING) {
    if (user.role === Role.DEPARTMENT_LEADER) {
      newStatus = WorkItemStatus.ADJUSTING;
      newApproverRole = Role.VICE_PRESIDENT;
      newApproverId = undefined;
    } else if (user.role === Role.VICE_PRESIDENT) {
      newStatus = WorkItemStatus.APPROVED;
      newApproverRole = undefined;
      newApproverId = undefined;
    } else {
      return { success: false, error: '无权审批调整申请' };
    }
  } else if (workItem.status === WorkItemStatus.CANCELLING) {
    if (workItem.type === WorkItemType.TODO) {
      if (user.role === Role.DEPARTMENT_LEADER && workItem.currentApproverRole === Role.DEPARTMENT_LEADER) {
        newStatus = WorkItemStatus.CANCELLING;
        newApproverRole = undefined;
        newApproverId = (workItem.proposedLeaderId ?? workItem.approvalLeaderId) ?? undefined;
      } else if ((user.role === Role.VICE_PRESIDENT || user.role === Role.PRESIDENT) && workItem.currentApproverId === user.userId) {
        newStatus = WorkItemStatus.CANCELLED;
        newApproverRole = undefined;
        newApproverId = undefined;
      } else {
        return { success: false, error: '无权审批取消申请' };
      }
    } else if (workItem.type === WorkItemType.MAIN) {
      if (user.role === Role.VICE_PRESIDENT) {
        newStatus = WorkItemStatus.CANCELLED;
        newApproverRole = undefined;
        newApproverId = undefined;
      } else {
        return { success: false, error: '无权审批取消申请' };
      }
    } else if (workItem.type === WorkItemType.PRIORITY) {
      if (user.role === Role.DEPARTMENT_LEADER) {
        newStatus = WorkItemStatus.CANCELLING;
        newApproverRole = Role.VICE_PRESIDENT;
        newApproverId = undefined;
      } else if (user.role === Role.VICE_PRESIDENT) {
        newStatus = WorkItemStatus.PENDING_MAIN_LEADER_CANCEL;
        newApproverRole = Role.PRESIDENT;
      } else if (user.role === Role.PRESIDENT) {
        newStatus = WorkItemStatus.CANCELLED;
        newApproverRole = undefined;
        newApproverId = undefined;
      } else {
        return { success: false, error: '无权审批取消申请' };
      }
    }
  } else if (workItem.status === WorkItemStatus.PENDING_MAIN_LEADER_CANCEL) {
    if (user.role === Role.PRESIDENT) {
      newStatus = WorkItemStatus.CANCELLED;
      newApproverRole = undefined;
      newApproverId = undefined;
    } else {
      return { success: false, error: '无权审批取消申请' };
    }
  } else {
    return { success: false, error: '当前状态不允许审批' };
  }

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: newStatus,
      currentApproverRole: newApproverRole,
      currentApproverId: newApproverId,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'approve',
    user.userId,
    workItem.status,
    newStatus,
    user.userId,
    user.role,
    comment
  );

  await logOperation(
    user.userId,
    user.role,
    user.role,
    'approve',
    workItemId,
    `审批通过：${workItem.title}`
  );

  return { success: true, workItem: updated };
}

export async function rejectWorkItem(workItemId: number, user: UserSession, rejectReason: string): Promise<WorkflowResult> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { creator: true },
  });

  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (!canUserApprove(user, workItem)) {
    return { success: false, error: '无权退回此事项' };
  }

  let newStatus: WorkItemStatus;

  if (workItem.status === WorkItemStatus.PENDING_DEPT ||
      workItem.status === WorkItemStatus.PENDING_COMPANY) {
    newStatus = WorkItemStatus.REJECTED;
  } else if (workItem.status === WorkItemStatus.PENDING_EVIDENCE_DEPT ||
             workItem.status === WorkItemStatus.PENDING_EVIDENCE_COMPANY) {
    newStatus = WorkItemStatus.APPROVED;
  } else if (workItem.status === WorkItemStatus.ADJUSTING) {
    if (workItem.type === WorkItemType.TODO) {
      newStatus = WorkItemStatus.IN_PROGRESS;
    } else {
      newStatus = WorkItemStatus.APPROVED;
    }
  } else if (workItem.status === WorkItemStatus.CANCELLING) {
    if (workItem.type === WorkItemType.TODO) {
      newStatus = WorkItemStatus.IN_PROGRESS;
    } else {
      newStatus = WorkItemStatus.APPROVED;
    }
  } else if (workItem.status === WorkItemStatus.PENDING_MAIN_LEADER_CANCEL) {
    newStatus = WorkItemStatus.APPROVED;
  } else {
    return { success: false, error: '当前状态不允许退回' };
  }

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: newStatus,
      rejectReason,
      rejectedFromStatus: workItem.status,
      currentApproverRole: undefined,
      currentApproverId: undefined,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'reject',
    user.userId,
    workItem.status,
    newStatus,
    user.userId,
    user.role,
    rejectReason
  );

  await logOperation(
    user.userId,
    user.role,
    user.role,
    'reject',
    workItemId,
    `审批退回：${workItem.title}，原因：${rejectReason}`
  );

  return { success: true, workItem: updated };
}

export async function submitEvidence(workItemId: number, user: UserSession, proof: string, comment?: string): Promise<WorkflowResult> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { creator: true },
  });

  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (workItem.status !== WorkItemStatus.APPROVED) {
    return { success: false, error: '当前状态不允许提交见证材料' };
  }

  if (workItem.creatorId !== user.userId && user.role !== Role.DEPARTMENT_LEADER && user.role !== Role.VICE_PRESIDENT) {
    return { success: false, error: '无权提交见证材料' };
  }

  let newStatus: WorkItemStatus;
  let newApproverRole: Role | undefined;

  if (workItem.type === WorkItemType.TODO) {
    return { success: false, error: '待办事项不需要见证材料审批' };
  }

  if (user.role === Role.DEPARTMENT_MANAGER || user.role === Role.DEPARTMENT_LEADER) {
    newStatus = WorkItemStatus.PENDING_EVIDENCE_DEPT;
    newApproverRole = Role.DEPARTMENT_LEADER;
  } else if (user.role === Role.VICE_PRESIDENT || user.role === Role.PRESIDENT) {
    newStatus = WorkItemStatus.PENDING_EVIDENCE_COMPANY;
    newApproverRole = Role.VICE_PRESIDENT;
  } else {
    return { success: false, error: '无权提交见证材料' };
  }

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: newStatus,
      proof,
      currentApproverRole: newApproverRole,
      currentApproverId: undefined,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'evidence',
    user.userId,
    workItem.status,
    newStatus,
    undefined,
    newApproverRole,
    comment
  );

  await logOperation(
    user.userId,
    user.role,
    user.role,
    'evidence',
    workItemId,
    `提交见证材料：${workItem.title}`
  );

  return { success: true, workItem: updated };
}

export async function submitAdjust(workItemId: number, user: UserSession, adjustReason: string, comment?: string): Promise<WorkflowResult> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { creator: true },
  });

  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  const canAdjust = (workItem.status === WorkItemStatus.APPROVED || workItem.status === WorkItemStatus.IN_PROGRESS) &&
    (workItem.creatorId === user.userId || user.role === Role.DEPARTMENT_LEADER);

  if (!canAdjust) {
    return { success: false, error: '无权申请调整' };
  }

  let newStatus: WorkItemStatus;
  let newApproverRole: Role | undefined;
  let newApproverId: number | undefined;

  if (workItem.type === WorkItemType.TODO) {
    if (user.role === Role.DEPARTMENT_MANAGER) {
      newStatus = WorkItemStatus.ADJUSTING;
      newApproverRole = Role.DEPARTMENT_LEADER;
    } else if (user.role === Role.DEPARTMENT_LEADER) {
      newStatus = WorkItemStatus.ADJUSTING;
      newApproverId = (workItem.proposedLeaderId ?? workItem.approvalLeaderId) ?? undefined;
    } else {
      return { success: false, error: '无权申请调整' };
    }
  } else {
    if (user.role === Role.DEPARTMENT_MANAGER) {
      newStatus = WorkItemStatus.ADJUSTING;
      newApproverRole = Role.DEPARTMENT_LEADER;
    } else if (user.role === Role.DEPARTMENT_LEADER) {
      newStatus = WorkItemStatus.ADJUSTING;
      newApproverRole = Role.VICE_PRESIDENT;
    } else {
      return { success: false, error: '无权申请调整' };
    }
  }

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: newStatus,
      adjustReason,
      currentApproverRole: newApproverRole,
      currentApproverId: newApproverId,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'adjust',
    user.userId,
    workItem.status,
    newStatus,
    undefined,
    newApproverRole,
    comment
  );

  await logOperation(
    user.userId,
    user.role,
    user.role,
    'adjust',
    workItemId,
    `申请调整：${workItem.title}，原因：${adjustReason}`
  );

  return { success: true, workItem: updated };
}

export async function submitCancel(workItemId: number, user: UserSession, cancelReason: string, comment?: string): Promise<WorkflowResult> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { creator: true },
  });

  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  const canCancel = (workItem.status === WorkItemStatus.APPROVED || workItem.status === WorkItemStatus.IN_PROGRESS) &&
    (workItem.creatorId === user.userId || user.role === Role.DEPARTMENT_LEADER);

  if (!canCancel) {
    return { success: false, error: '无权申请取消' };
  }

  let newStatus: WorkItemStatus;
  let newApproverRole: Role | undefined;
  let newApproverId: number | undefined;

  if (workItem.type === WorkItemType.TODO) {
    if (user.role === Role.DEPARTMENT_MANAGER) {
      newStatus = WorkItemStatus.CANCELLING;
      newApproverRole = Role.DEPARTMENT_LEADER;
    } else if (user.role === Role.DEPARTMENT_LEADER) {
      newStatus = WorkItemStatus.CANCELLING;
      newApproverId = (workItem.proposedLeaderId ?? workItem.approvalLeaderId) ?? undefined;
    } else {
      return { success: false, error: '无权申请取消' };
    }
  } else {
    if (user.role === Role.DEPARTMENT_MANAGER) {
      newStatus = WorkItemStatus.CANCELLING;
      newApproverRole = Role.DEPARTMENT_LEADER;
    } else if (user.role === Role.DEPARTMENT_LEADER) {
      newStatus = WorkItemStatus.CANCELLING;
      newApproverRole = Role.VICE_PRESIDENT;
    } else {
      return { success: false, error: '无权申请取消' };
    }
  }

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: newStatus,
      cancelReason,
      currentApproverRole: newApproverRole,
      currentApproverId: undefined,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'cancel',
    user.userId,
    workItem.status,
    newStatus,
    undefined,
    newApproverRole,
    comment
  );

  await logOperation(
    user.userId,
    user.role,
    user.role,
    'cancel',
    workItemId,
    `申请取消：${workItem.title}，原因：${cancelReason}`
  );

  return { success: true, workItem: updated };
}

export async function decomposeTodo(workItemId: number, user: UserSession, nodes: any[], comment?: string): Promise<WorkflowResult> {
  const workItem = await prisma.workItem.findUnique({
    where: { id: workItemId },
    include: { creator: true },
  });

  if (!workItem) {
    return { success: false, error: '事项不存在' };
  }

  if (workItem.status !== WorkItemStatus.PENDING_DECOMPOSE) {
    return { success: false, error: '当前状态不允许分解' };
  }

  let newStatus: WorkItemStatus;
  let newApproverRole: Role | undefined;
  let newApproverId: number | undefined;

  if (user.role === Role.DEPARTMENT_MANAGER) {
    newStatus = WorkItemStatus.PENDING_DEPT;
    newApproverRole = Role.DEPARTMENT_LEADER;
  } else if (user.role === Role.DEPARTMENT_LEADER) {
    newStatus = WorkItemStatus.PENDING_COMPANY;
    newApproverId = workItem.proposedLeaderId || undefined;
  } else {
    return { success: false, error: '无权分解待办事项' };
  }

  const updated = await prisma.workItem.update({
    where: { id: workItemId },
    data: {
      status: newStatus,
      nodes: JSON.stringify(nodes),
      currentApproverRole: newApproverRole,
      currentApproverId: newApproverId,
    },
  });

  await createWorkflowRecord(
    workItemId,
    'decompose',
    user.userId,
    workItem.status,
    newStatus,
    undefined,
    newApproverRole,
    comment
  );

  await logOperation(
    user.userId,
    user.role,
    user.role,
    'decompose',
    workItemId,
    `分解待办事项：${workItem.title}`
  );

  return { success: true, workItem: updated };
}

export async function getWorkflowRecords(workItemId: number): Promise<any[]> {
  const records = await prisma.workflowRecord.findMany({
    where: { workItemId },
    orderBy: { createdAt: 'asc' },
    include: {
      initiator: { select: { id: true, name: true, role: true } },
      approver: { select: { id: true, name: true, role: true } },
    },
  });

  return records.map(r => ({
    id: r.id,
    actionType: r.actionType,
    statusBefore: r.statusBefore,
    statusAfter: r.statusAfter,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    initiator: r.initiator ? {
      id: r.initiator.id,
      name: r.initiator.name,
      role: r.initiator.role,
    } : null,
    approver: r.approver ? {
      id: r.approver.id,
      name: r.approver.name,
      role: r.approver.role,
    } : null,
  }));
}