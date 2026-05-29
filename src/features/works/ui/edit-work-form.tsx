'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, ListTodo, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WorkFormShell } from '@/features/works/ui/work-form-shell';
import { WorkFormSectionCard } from '@/features/works/ui/work-form-section-card';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import { WorkFormMainContent } from '@/features/works/ui/work-form-main-content';
import type { Cooperator, Work, WorkEditablePatch, WorkNode, WorkType } from '@/features/works/client/work-client.types';
import type { Department } from '@/features/departments/client/department-api';
import type { User } from '@/features/users/client/user-client.types';
import { FIELD_LABEL, HINT_BOX, STICKY_ACTION_BAR } from '@/features/works/ui/visual-tokens';

export type EditWorkFormMode = 'edit' | 'adjust';

interface EditWorkFormProps {
  mode: EditWorkFormMode;
  routeType: string;
  work: Work;
  user: User;
  departments: Department[];
  companyLeaders: User[];
  rejectReason?: string;
  onSubmit: (patch: WorkEditablePatch, reason: string) => Promise<void>;
}

const TYPE_TO_ROUTE: Record<WorkType, string> = {
  重点: 'priority',
  主要: 'main',
  待办: 'todo',
};

function buildInitialPriorityMainForm(work: Work) {
  return {
    businessCategory: work.businessCategory || '',
    workItem: work.workItem || work.title || '',
    workNode: work.workNode || '',
    planCompleteTime: work.planCompleteTime || '',
    completeForm: work.completeForm || '',
    departmentId: work.departmentId ? String(work.departmentId) : '',
    responsibleLeader: work.responsibleLeader || '',
    responsiblePerson: work.responsiblePerson || '',
    responsibleLeaderMemberId: work.responsibleLeaderMemberId,
    responsiblePersonMemberId: work.responsiblePersonMemberId,
  };
}

function buildInitialTodoForm(work: Work) {
  return {
    proposedLeaderId: work.proposedLeaderId ? String(work.proposedLeaderId) : '',
    proposedScene: work.proposedScene || '',
    workItem: work.workItem || work.title || '',
    formedTime: work.formedTime || '',
    departmentId: work.departmentId || 0,
    responsibleLeader: work.responsibleLeader || '',
    responsiblePerson: work.responsiblePerson || '',
    responsibleLeaderMemberId: work.responsibleLeaderMemberId,
    responsiblePersonMemberId: work.responsiblePersonMemberId,
    cooperators: (work.cooperators || []) as Cooperator[],
    workPlan: work.workPlan || '',
    planCompleteTime: work.planCompleteTime || '',
    progress: work.progress || '',
  };
}

function filterValidNodes(nodes: WorkNode[]) {
  return nodes
    .filter((node) => node.title?.trim())
    .map((node) => ({
      ...node,
      children: (node.children || []).filter((child) => child.title?.trim()),
    }));
}

export function EditWorkForm({
  mode,
  routeType,
  work,
  user,
  departments,
  companyLeaders,
  rejectReason,
  onSubmit,
}: EditWorkFormProps) {
  const type = work.type;
  const isPriorityOrMain = type === '重点' || type === '主要';
  const isTodo = type === '待办';
  const isAdjust = mode === 'adjust';

  const [isInnovation, setIsInnovation] = useState(!!work.isInnovation);
  const [nodes, setNodes] = useState<WorkNode[]>((work.nodes || []) as WorkNode[]);
  const [priorityMainForm, setPriorityMainForm] = useState(() => buildInitialPriorityMainForm(work));
  const [todoForm, setTodoForm] = useState(() => buildInitialTodoForm(work));
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const businessDepts = useMemo(
    () => departments.filter((d) => d.isBusiness !== false),
    [departments],
  );
  const isDepartmentUser = user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER';
  const deptOptions = isDepartmentUser
    ? businessDepts.filter((d) => d.id === user.departmentId)
    : businessDepts;
  const cooperatorOptions = businessDepts.filter((d) => d.id !== todoForm.departmentId);

  const accentBar = routeType === 'priority' ? 'bg-rose-500' : routeType === 'main' ? 'bg-sky-500' : 'bg-emerald-500';
  const TitleIcon = routeType === 'priority' ? Star : routeType === 'main' ? ListTodo : CheckSquare;
  const themeKey = routeType === 'priority' ? 'priority' : routeType === 'main' ? 'main' : 'todo';
  const titlePrefix = isAdjust ? '申请调整' : '编辑';
  const requiresReason = isAdjust || !!rejectReason;
  const reasonLabel = isAdjust ? '调整原因' : (rejectReason ? '修改说明 / 重新提交原因' : '修改说明');

  const buildPatch = (): WorkEditablePatch => {
    if (isPriorityOrMain) {
      return {
        title: priorityMainForm.workItem || work.title,
        workItem: priorityMainForm.workItem,
        businessCategory: priorityMainForm.businessCategory,
        workNode: priorityMainForm.workNode,
        planCompleteTime: priorityMainForm.planCompleteTime,
        completeForm: priorityMainForm.completeForm,
        departmentId: priorityMainForm.departmentId ? Number(priorityMainForm.departmentId) : null,
        responsibleLeader: priorityMainForm.responsibleLeader,
        responsiblePerson: priorityMainForm.responsiblePerson,
        responsibleLeaderMemberId: priorityMainForm.responsibleLeaderMemberId ?? null,
        responsiblePersonMemberId: priorityMainForm.responsiblePersonMemberId ?? null,
        isInnovation: type === '重点' ? isInnovation : false,
        nodes: filterValidNodes(nodes),
      };
    }

    const selectedProposedLeader = companyLeaders.find((leader) => leader.id === Number(todoForm.proposedLeaderId));
    const patch: WorkEditablePatch = {
      title: todoForm.workItem || work.title,
      workItem: todoForm.workItem,
      proposedScene: todoForm.proposedScene,
      formedTime: todoForm.formedTime,
      departmentId: todoForm.departmentId || null,
      responsibleLeader: todoForm.responsibleLeader,
      responsiblePerson: todoForm.responsiblePerson,
      responsibleLeaderMemberId: todoForm.responsibleLeaderMemberId ?? null,
      responsiblePersonMemberId: todoForm.responsiblePersonMemberId ?? null,
      cooperators: todoForm.cooperators.filter((c) => c.departmentId > 0),
      workPlan: todoForm.workPlan,
      planCompleteTime: todoForm.planCompleteTime,
      progress: todoForm.progress,
      nodes: filterValidNodes(nodes),
    };

    if (!isAdjust) {
      patch.proposedLeader = selectedProposedLeader?.name || work.proposedLeader || null;
      patch.proposedLeaderId = todoForm.proposedLeaderId ? Number(todoForm.proposedLeaderId) : null;
      patch.proposedLeaderRole = selectedProposedLeader?.role || work.proposedLeaderRole || null;
    }

    return patch;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (requiresReason && !reason.trim()) {
      alert(isAdjust ? '请填写调整原因' : '请填写修改说明');
      return;
    }
    if (isTodo && !todoForm.workItem.trim()) {
      alert('请填写待办事项');
      return;
    }
    if (isPriorityOrMain && !priorityMainForm.workItem.trim()) {
      alert('请填写工作事项');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(buildPatch(), reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const auxiliary = (
    <div className={HINT_BOX}>
      <p className="font-medium text-slate-700 mb-2">辅助信息</p>
      <div className="grid gap-2 text-xs text-slate-600">
        <div>创建人：{work.creatorName || '-'}</div>
        <div>首次提交人：{work.firstSubmitterName || '-'}</div>
        <div>公司审批领导：{work.approvalLeader || work.proposedLeader || '-'}</div>
        <div>当前状态：{work.status}</div>
      </div>
    </div>
  );

  const sidebar = (
    <>
      <WorkFormNodes
        nodes={nodes}
        onChange={setNodes}
        nodeLabel={isTodo ? '任务节点（可选）' : '工作节点（可选）'}
        nodePlaceholderPrefix={isTodo ? '任务节点' : '工作节点'}
      />
      {isTodo && (
        <WorkFormCooperators
          cooperators={todoForm.cooperators}
          onChange={(cooperators) => setTodoForm((prev) => ({ ...prev, cooperators }))}
          departments={cooperatorOptions}
        />
      )}
      {auxiliary}
    </>
  );

  return (
    <WorkFormShell
      backHref={`/${routeType}/${work.id}`}
      title={`${titlePrefix}${type}`}
      accentBar={accentBar}
      icon={<TitleIcon className="h-6 w-6" />}
      themeKey={themeKey}
      sidebar={sidebar}
      onSubmit={handleSubmit}
    >
      {requiresReason && (
        <WorkFormSectionCard title={isAdjust ? '调整申请' : '退回处理'}>
          {rejectReason && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 whitespace-pre-wrap break-words">
              退回原因：{rejectReason}
            </div>
          )}
          <div>
            <label className={FIELD_LABEL + ' mb-1 block'}>{reasonLabel}</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={isAdjust ? '请填写调整原因' : '请填写修改说明'}
            />
          </div>
        </WorkFormSectionCard>
      )}

      <WorkFormMainContent
        type={type}
        user={user}
        isPriorityOrMain={isPriorityOrMain}
        isTodo={isTodo}
        priorityMainForm={priorityMainForm}
        setPriorityMainForm={setPriorityMainForm}
        todoForm={todoForm}
        setTodoForm={setTodoForm}
        isInnovation={isInnovation}
        setIsInnovation={setIsInnovation}
        departments={deptOptions}
        companyLeaders={companyLeaders}
        readonlyProposedLeaderName={isAdjust && isTodo ? work.proposedLeader : undefined}
      />

      <div className={STICKY_ACTION_BAR}>
        <Link href={`/${TYPE_TO_ROUTE[type] || routeType}/${work.id}`}>
          <Button variant="outline" type="button" className="rounded-full border-slate-200 bg-white/80">
            取消
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-slate-950 px-5 text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800"
        >
          {isAdjust ? '提交调整申请' : (rejectReason ? '保存修改并重新提交' : '保存修改')}
        </Button>
      </div>
    </WorkFormShell>
  );
}
