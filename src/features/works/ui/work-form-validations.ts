import type { WorkNode } from '@/features/works/client/work-client.types';

export interface CreateWorkFormUser {
  role?: string;
}

export interface CreateWorkFormInput {
  user: CreateWorkFormUser | null | undefined;
  isPriorityOrMain: boolean;
  isTodo: boolean;
  priorityMainWorkItem: string;
  priorityMainDepartmentId: string;
  todoWorkItem: string;
  todoDepartmentId: number;
  todoProposedLeaderId: string;
  companyLeaders: Array<{ id: number; name: string; role: string }>;
  nodes: WorkNode[];
}

export type CreateWorkFormField = 'workItem' | 'departmentId' | 'proposedLeaderId' | 'nodes';

export type CreateWorkFormErrors = Partial<Record<CreateWorkFormField, string>>;

export function validateCreateWorkFormFields(input: CreateWorkFormInput): CreateWorkFormErrors {
  const errors: CreateWorkFormErrors = {};
  const { user, isPriorityOrMain, isTodo } = input;

  if (!user) {
    return errors;
  }

  if (isPriorityOrMain) {
    if (!input.priorityMainWorkItem.trim()) {
      errors.workItem = '请输入工作事项';
    }
    if (!input.priorityMainDepartmentId) {
      errors.departmentId = '请选择责任部门';
    }
  } else if (isTodo) {
    if (!input.todoWorkItem.trim()) {
      errors.workItem = '请输入待办事项';
    }
    if (!input.todoDepartmentId) {
      errors.departmentId = '请选择主责部门';
    }
    if (!input.todoProposedLeaderId) {
      errors.proposedLeaderId = '请选择事项提出领导';
    }

    const selectedProposedLeader = input.companyLeaders.find(
      (leader) => leader.id === Number(input.todoProposedLeaderId),
    );

    if (!selectedProposedLeader) {
      errors.proposedLeaderId = '请选择事项提出领导';
    }

    if (
      user.role === 'DEPARTMENT_MANAGER' ||
      user.role === 'DEPARTMENT_LEADER'
    ) {
      const validNodes = input.nodes
        .filter((node) => node.title.trim())
        .map((node) => ({
          ...node,
          children: node.children.filter((child) => child.title.trim()),
        }));

      if (validNodes.length > 0 && validNodes.some((node) => !node.completeTime)) {
        errors.nodes = '请填写每个任务节点的完成时间';
      }
    }
  }

  return errors;
}
