import type { User } from '@/lib/auth';
import type { WorkNode, WorkType } from '@/lib/work-store';

interface BuildCreateWorkPayloadParams {
  type: string;
  user: User;
  priorityMainForm: {
    businessCategory: string;
    workItem: string;
    workNode: string;
    planCompleteTime: string;
    completeForm: string;
    departmentId: string;
    responsibleLeader: string;
    responsiblePerson: string;
  };
  todoForm: {
    proposedLeaderId: string;
    proposedScene: string;
    workItem: string;
    formedTime: string;
    departmentId: number;
    responsibleLeader: string;
    responsiblePerson: string;
    cooperators: Array<{ departmentId: number; departmentName?: string; leader?: string; person?: string }>;
    workPlan: string;
    planCompleteTime: string;
    progress: string;
  };
  isInnovation: boolean;
  nodes: WorkNode[];
  companyLeaders: Array<{ id: number; name: string; role: string }>;
}

export function buildCreateWorkPayload({
  type,
  user,
  priorityMainForm,
  todoForm,
  isInnovation,
  nodes,
  companyLeaders,
}: BuildCreateWorkPayloadParams) {
  const isPriorityOrMain = type === '重点' || type === '主要';
  const isTodo = type === '待办';

  const selectedProposedLeader = isTodo
    ? companyLeaders.find((leader) => leader.id === Number(todoForm.proposedLeaderId))
    : null;

  const validNodes = nodes
    .filter((node) => node.title.trim())
    .map((node) => ({
      ...node,
      children: node.children.filter((child) => child.title.trim()),
    }));

  if (isPriorityOrMain) {
    return {
      id: Date.now(),
      title: priorityMainForm.workItem,
      type: type as WorkType,
      departmentId: Number(priorityMainForm.departmentId),
      creatorRole: user.role,
      creatorId: user.id,
      action: 'create' as const,
      status: 'draft' as const,
      needCeo: type === '重点',
      isInnovation: type === '重点' ? isInnovation : false,
      nodes: nodes.filter((node) => node.title.trim()).map((node) => ({
        ...node,
        children: node.children.filter((child) => child.title.trim()),
      })),
      businessCategory: priorityMainForm.businessCategory,
      workItem: priorityMainForm.workItem,
      workNode: priorityMainForm.workNode,
      planCompleteTime: priorityMainForm.planCompleteTime,
      completeForm: priorityMainForm.completeForm,
      responsibleLeader: priorityMainForm.responsibleLeader,
      responsiblePerson: priorityMainForm.responsiblePerson,
    };
  }

  const cooperators = todoForm.cooperators.filter((c) => c.departmentId > 0);

  return {
    id: Date.now(),
    title: todoForm.workItem,
    type: '待办' as WorkType,
    departmentId: todoForm.departmentId || 2,
    creatorRole: user.role,
    creatorId: user.id,
    action: 'todo_decompose' as const,
    status: 'draft' as const,
    needCeo: false,
    proposedLeader: selectedProposedLeader?.name || '',
    proposedLeaderId: selectedProposedLeader?.id,
    proposedLeaderRole: selectedProposedLeader?.role,
    approvalLeaderId: selectedProposedLeader?.id,
    proposedScene: todoForm.proposedScene,
    workItem: todoForm.workItem,
    formedTime: todoForm.formedTime,
    cooperators,
    workPlan: todoForm.workPlan,
    planCompleteTime: todoForm.planCompleteTime,
    progress: todoForm.progress,
    nodes: validNodes,
  };
}
