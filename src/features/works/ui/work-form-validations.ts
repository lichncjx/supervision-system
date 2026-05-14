import type { WorkNode } from '@/features/works/domain/work-client.types';

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

export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateCreateWorkForm(input: CreateWorkFormInput): ValidationResult {
  const { user, isPriorityOrMain, isTodo } = input;

  if (!user) {
    return { valid: false, message: '请先登录' };
  }

  if (isPriorityOrMain) {
    if (!input.priorityMainWorkItem.trim()) {
      return { valid: false, message: '请输入工作事项' };
    }
    if (!input.priorityMainDepartmentId) {
      return { valid: false, message: '请选择责任部门' };
    }
  } else if (isTodo) {
    if (!input.todoWorkItem.trim()) {
      return { valid: false, message: '请输入待办事项' };
    }
    if (!input.todoDepartmentId) {
      return { valid: false, message: '请选择主责部门' };
    }
    if (!input.todoProposedLeaderId) {
      return { valid: false, message: '请选择事项提出领导' };
    }
  }

  const selectedProposedLeader = isTodo
    ? input.companyLeaders.find((leader) => leader.id === Number(input.todoProposedLeaderId))
    : null;

  if (isTodo && !selectedProposedLeader) {
    return { valid: false, message: '请选择事项提出领导' };
  }

  // 待办事项由部门发起时，已填写标题的节点需要完成时间
  const validNodes = input.nodes
    .filter((node) => node.title.trim())
    .map((node) => ({
      ...node,
      children: node.children.filter((child) => child.title.trim()),
    }));

  if (
    isTodo &&
    validNodes.length > 0 &&
    (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
    validNodes.some((node) => !node.completeTime)
  ) {
    return { valid: false, message: '请填写每个任务节点的完成时间' };
  }

  return { valid: true };
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
