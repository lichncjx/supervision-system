'use client';

import React from 'react';
import { isCompanyLevel } from '@/features/users/domain/role.rules';
import { WorkFormSectionCard } from '@/features/works/ui/work-form-section-card';
import {
  DepartmentField,
  IsInnovationField,
  PlanCompleteTimeField,
  ProposedLeaderField,
  ResponsibleFields,
  TodoSpecificFields,
  WorkItemField,
} from '@/features/works/ui/work-form-fields';
import type { WorkType } from '@/features/works/client/work-client.types';
import type { Cooperator } from '@/features/works/client/work-client.types';
import type { Department } from '@/features/departments/client/department-api';
import type { User } from '@/features/users/client/user-client.types';
import { FIELD_LABEL } from '@/features/works/ui/visual-tokens';

export interface PriorityMainFormState {
  businessCategory: string;
  workItem: string;
  workNode: string;
  planCompleteTime: string;
  completeForm: string;
  departmentId: string;
  responsibleLeader: string;
  responsiblePerson: string;
  responsibleLeaderMemberId: number | undefined;
  responsiblePersonMemberId: number | undefined;
}

export interface TodoFormState {
  proposedLeaderId: string;
  proposedScene: string;
  workItem: string;
  formedTime: string;
  departmentId: number;
  responsibleLeader: string;
  responsiblePerson: string;
  responsibleLeaderMemberId: number | undefined;
  responsiblePersonMemberId: number | undefined;
  cooperators: Cooperator[];
  workPlan: string;
  planCompleteTime: string;
  progress: string;
}

interface WorkFormContentProps {
  type: WorkType;
  user?: User | null;
  isPriorityOrMain: boolean;
  isTodo: boolean;
  priorityMainForm: PriorityMainFormState;
  setPriorityMainForm: React.Dispatch<React.SetStateAction<PriorityMainFormState>>;
  todoForm: TodoFormState;
  setTodoForm: React.Dispatch<React.SetStateAction<TodoFormState>>;
  isInnovation: boolean;
  setIsInnovation: (value: boolean) => void;
  departments: Department[];
  companyLeaders: User[];
  readonlyProposedLeaderName?: string | null;
  workItemError?: string;
  departmentError?: string;
  proposedLeaderError?: string;
  onWorkItemBlur?: () => void;
  onDepartmentBlur?: () => void;
  onProposedLeaderBlur?: () => void;
}

function ReadonlyInfo({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div>
      <div className={FIELD_LABEL + ' mb-1'}>{label}</div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {value || '-'}
      </div>
    </div>
  );
}

export function WorkFormContent({
  type,
  user,
  isPriorityOrMain,
  isTodo,
  priorityMainForm,
  setPriorityMainForm,
  todoForm,
  setTodoForm,
  isInnovation,
  setIsInnovation,
  departments,
  companyLeaders,
  readonlyProposedLeaderName,
  workItemError,
  departmentError,
  proposedLeaderError,
  onWorkItemBlur,
  onDepartmentBlur,
  onProposedLeaderBlur,
}: WorkFormContentProps) {
  if (isPriorityOrMain) {
    return (
      <>
        <WorkFormSectionCard title="基本信息">
          <WorkItemField
            label="业务类别"
            value={priorityMainForm.businessCategory}
            onChange={(v) => setPriorityMainForm((prev) => ({ ...prev, businessCategory: v }))}
            placeholder="请输入业务类别"
          />
          <WorkItemField
            label="工作事项"
            value={priorityMainForm.workItem}
            onChange={(v) => setPriorityMainForm((prev) => ({ ...prev, workItem: v }))}
            placeholder="请输入工作事项"
            error={workItemError}
            onBlur={onWorkItemBlur}
            fieldId="field-workItem"
          />
          {type === '重点' && (
            <IsInnovationField
              isInnovation={isInnovation}
              onChange={setIsInnovation}
            />
          )}
          <PlanCompleteTimeField
            label="完成时间"
            value={priorityMainForm.planCompleteTime}
            onChange={(v) => setPriorityMainForm((prev) => ({ ...prev, planCompleteTime: v }))}
          />
          <WorkItemField
            label="完成形式"
            value={priorityMainForm.completeForm}
            onChange={(v) => setPriorityMainForm((prev) => ({ ...prev, completeForm: v }))}
            placeholder="请输入完成形式"
          />
        </WorkFormSectionCard>

        <WorkFormSectionCard title="责任分工">
          <div className="flex gap-4 [&>div]:flex-1">
            <DepartmentField
              label="责任部门"
              value={priorityMainForm.departmentId}
              onChange={(v) => setPriorityMainForm((prev) => ({
                ...prev,
                departmentId: v,
                responsibleLeader: '',
                responsiblePerson: '',
                responsibleLeaderMemberId: undefined,
                responsiblePersonMemberId: undefined,
              }))}
              departments={departments}
              placeholder="请选择责任部门"
              error={departmentError}
              onBlur={onDepartmentBlur}
              fieldId="field-departmentId"
            />
            <ResponsibleFields
              leaderValue={priorityMainForm.responsibleLeader}
              onLeaderChange={(v) => setPriorityMainForm((prev) => ({ ...prev, responsibleLeader: v }))}
              personValue={priorityMainForm.responsiblePerson}
              onPersonChange={(v) => setPriorityMainForm((prev) => ({ ...prev, responsiblePerson: v }))}
              departmentId={Number(priorityMainForm.departmentId) || undefined}
              leaderMemberId={priorityMainForm.responsibleLeaderMemberId}
              onLeaderMemberIdChange={(id) => setPriorityMainForm((prev) => ({ ...prev, responsibleLeaderMemberId: id }))}
              personMemberId={priorityMainForm.responsiblePersonMemberId}
              onPersonMemberIdChange={(id) => setPriorityMainForm((prev) => ({ ...prev, responsiblePersonMemberId: id }))}
            />
          </div>
        </WorkFormSectionCard>
      </>
    );
  }

  if (isTodo) {
    return (
      <>
        <WorkFormSectionCard title="基本信息">
          {readonlyProposedLeaderName !== undefined ? (
            <ReadonlyInfo label="事项提出领导" value={readonlyProposedLeaderName} />
          ) : (
            <ProposedLeaderField
              value={todoForm.proposedLeaderId}
              onChange={(v) => setTodoForm((prev) => ({ ...prev, proposedLeaderId: v }))}
              leaders={companyLeaders}
              disabled={isCompanyLevel(user?.role)}
              error={proposedLeaderError}
              onBlur={onProposedLeaderBlur}
              fieldId="field-proposedLeaderId"
            />
          )}
          <TodoSpecificFields
            proposedScene={todoForm.proposedScene}
            onProposedSceneChange={(v) => setTodoForm((prev) => ({ ...prev, proposedScene: v }))}
            formedTime={todoForm.formedTime}
            onFormedTimeChange={(v) => setTodoForm((prev) => ({ ...prev, formedTime: v }))}
            workPlan={todoForm.workPlan}
            onWorkPlanChange={(v) => setTodoForm((prev) => ({ ...prev, workPlan: v }))}
            progress={todoForm.progress}
            onProgressChange={(v) => setTodoForm((prev) => ({ ...prev, progress: v }))}
          />
          <WorkItemField
            label="待办事项"
            value={todoForm.workItem}
            onChange={(v) => setTodoForm((prev) => ({ ...prev, workItem: v }))}
            placeholder="请输入待办事项"
            error={workItemError}
            onBlur={onWorkItemBlur}
            fieldId="field-workItem"
          />
          <PlanCompleteTimeField
            label="完成时间"
            value={todoForm.planCompleteTime}
            onChange={(v) => setTodoForm((prev) => ({ ...prev, planCompleteTime: v }))}
          />
        </WorkFormSectionCard>

        <WorkFormSectionCard title="责任分工">
          <div className="flex gap-4 [&>div]:flex-1">
            <DepartmentField
              label="主责部门"
              value={todoForm.departmentId ? String(todoForm.departmentId) : ''}
              onChange={(v) => setTodoForm((prev) => ({
                ...prev,
                departmentId: v ? Number(v) : 0,
                responsibleLeader: '',
                responsiblePerson: '',
                responsibleLeaderMemberId: undefined,
                responsiblePersonMemberId: undefined,
              }))}
              departments={departments}
              placeholder="请选择主责部门"
              error={departmentError}
              onBlur={onDepartmentBlur}
              fieldId="field-departmentId"
            />
            <ResponsibleFields
              leaderValue={todoForm.responsibleLeader}
              onLeaderChange={(v) => setTodoForm((prev) => ({ ...prev, responsibleLeader: v }))}
              personValue={todoForm.responsiblePerson}
              onPersonChange={(v) => setTodoForm((prev) => ({ ...prev, responsiblePerson: v }))}
              departmentId={todoForm.departmentId || undefined}
              leaderMemberId={todoForm.responsibleLeaderMemberId}
              onLeaderMemberIdChange={(id) => setTodoForm((prev) => ({ ...prev, responsibleLeaderMemberId: id }))}
              personMemberId={todoForm.responsiblePersonMemberId}
              onPersonMemberIdChange={(id) => setTodoForm((prev) => ({ ...prev, responsiblePersonMemberId: id }))}
            />
          </div>
        </WorkFormSectionCard>
      </>
    );
  }

  return null;
}
