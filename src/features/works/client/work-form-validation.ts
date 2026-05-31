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
  todoCooperators?: Array<{ departmentId: number }>;
  companyLeaders: Array<{ id: number; name: string; role: string }>;
  nodes: WorkNode[];
}

export type CreateWorkFormField = 'workItem' | 'departmentId' | 'proposedLeaderId' | 'cooperators' | 'nodes';

export type CreateWorkFormErrors = Partial<Record<CreateWorkFormField, string>>;

export type WorkFormValidationField =
  | 'reason'
  | 'workItem'
  | 'departmentId'
  | 'proposedLeaderId'
  | 'cooperators'
  | 'nodes';

export type WorkFormValidationErrors = Partial<Record<WorkFormValidationField, string>>;

interface ValidateEditableWorkFormInput {
  isPriorityOrMain: boolean;
  isTodo: boolean;
  requiresReason?: boolean;
  reason?: string;
  reasonMessage?: string;
  priorityMainWorkItem: string;
  priorityMainDepartmentId: string;
  todoWorkItem: string;
  todoDepartmentId: number;
  todoProposedLeaderId?: string;
  validateProposedLeader?: boolean;
  companyLeaders?: Array<{ id: number; name: string; role: string }>;
  cooperators?: Array<{ departmentId: number }>;
}

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

    const cooperatorDepartmentIds = (input.todoCooperators || [])
      .map((cooperator) => cooperator.departmentId)
      .filter((departmentId) => departmentId > 0);
    if (input.todoDepartmentId && cooperatorDepartmentIds.includes(input.todoDepartmentId)) {
      errors.cooperators = '主责部门不能同时作为配合部门，请修改';
    } else if (new Set(cooperatorDepartmentIds).size !== cooperatorDepartmentIds.length) {
      errors.cooperators = '同一部门不能重复添加为配合方，请修改';
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

function validateEditableWorkFormFields(input: ValidateEditableWorkFormInput): WorkFormValidationErrors {
  const errors: WorkFormValidationErrors = {};

  if (input.requiresReason && !input.reason?.trim()) {
    errors.reason = input.reasonMessage || '请填写说明';
  }

  if (input.isPriorityOrMain) {
    if (!input.priorityMainWorkItem.trim()) {
      errors.workItem = '请输入工作事项';
    }
    if (!input.priorityMainDepartmentId) {
      errors.departmentId = '请选择责任部门';
    }
  } else if (input.isTodo) {
    if (!input.todoWorkItem.trim()) {
      errors.workItem = '请输入待办事项';
    }
    if (!input.todoDepartmentId) {
      errors.departmentId = '请选择主责部门';
    }

    if (input.validateProposedLeader) {
      const selectedProposedLeader = input.companyLeaders?.find(
        (leader) => leader.id === Number(input.todoProposedLeaderId),
      );
      if (!input.todoProposedLeaderId || !selectedProposedLeader) {
        errors.proposedLeaderId = '请选择事项提出领导';
      }
    }

    const cooperatorDepartmentIds = (input.cooperators || [])
      .map((cooperator) => cooperator.departmentId)
      .filter((departmentId) => departmentId > 0);
    if (input.todoDepartmentId && cooperatorDepartmentIds.includes(input.todoDepartmentId)) {
      errors.cooperators = '主责部门不能同时作为配合部门，请修改';
    } else if (new Set(cooperatorDepartmentIds).size !== cooperatorDepartmentIds.length) {
      errors.cooperators = '同一部门不能重复添加为配合方，请修改';
    }
  }

  return errors;
}

export function validateEditWorkFormFields(input: ValidateEditableWorkFormInput): WorkFormValidationErrors {
  return validateEditableWorkFormFields({
    ...input,
    validateProposedLeader: input.isTodo,
  });
}

export function validateAdjustWorkFormFields(input: ValidateEditableWorkFormInput): WorkFormValidationErrors {
  return validateEditableWorkFormFields({
    ...input,
    requiresReason: true,
    reasonMessage: input.reasonMessage || '请填写调整原因',
    validateProposedLeader: false,
  });
}

export function firstWorkFormValidationMessage(errors: WorkFormValidationErrors): string | undefined {
  return Object.values(errors).find(Boolean);
}
