'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckSquare, ListTodo, Star } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WorkFormShell } from '@/features/works/ui/work-form-shell';
import { WorkFormSectionCard } from '@/features/works/ui/work-form-section-card';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import {
  DepartmentField,
  IsInnovationField,
  PlanCompleteTimeField,
  ResponsibleFields,
  TodoSpecificFields,
  WorkItemField,
} from '@/features/works/ui/work-form-fields';
import { useWorkDetailData } from '@/features/works/client/use-work-detail-data';
import {
  firstWorkFormValidationMessage,
  validateAdjustWorkFormFields,
} from '@/features/works/client/work-form-validation';
import { submitAdjust } from '@/features/workflow/client/workflow-api';
import { isInProgress } from '@/features/works/domain/work-status.rules';
import { isOwnedBy } from '@/features/works/client/work-client-permissions';
import type { Cooperator, Work, WorkEditablePatch, WorkNode, WorkType } from '@/features/works/client/work-client.types';
import { FIELD_LABEL, HINT_BOX, STICKY_ACTION_BAR } from '@/features/works/ui/visual-tokens';

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

export default function AdjustWorkPage() {
  const params = useParams<{ type: string; id: string }>();
  const routeType = params?.type || 'todo';
  const id = params?.id || '';
  const router = useRouter();
  const { user } = useAuth();
  const { work, departments } = useWorkDetailData(id);

  const [isInnovation, setIsInnovation] = useState(false);
  const [nodes, setNodes] = useState<WorkNode[]>([]);
  const [priorityMainForm, setPriorityMainForm] = useState<ReturnType<typeof buildInitialPriorityMainForm> | null>(null);
  const [todoForm, setTodoForm] = useState<ReturnType<typeof buildInitialTodoForm> | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!work) return;
    setIsInnovation(!!work.isInnovation);
    setNodes((work.nodes || []) as WorkNode[]);
    setPriorityMainForm(buildInitialPriorityMainForm(work));
    setTodoForm(buildInitialTodoForm(work));
  }, [work]);

  const businessDepts = useMemo(
    () => departments.filter((d) => d.isBusiness !== false),
    [departments],
  );

  if (!work || !user || !priorityMainForm || !todoForm) {
    return <div className="p-8 text-center text-slate-500">加载中...</div>;
  }

  const canAdjust =
    isInProgress(work.status) &&
    user.role !== 'ADMIN' &&
    user.role !== 'SUPERVISOR' &&
    isOwnedBy(user, work);

  if (!canAdjust) {
    return <div className="p-8 text-center text-red-600">无权申请调整该事项</div>;
  }

  const type = work.type;
  const isPriorityOrMain = type === '重点' || type === '主要';
  const isTodo = type === '待办';
  const isDepartmentUser = user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER';
  const deptOptions = isDepartmentUser
    ? businessDepts.filter((d) => d.id === user.departmentId)
    : businessDepts;
  const cooperatorOptions = businessDepts.filter((d) => d.id !== todoForm.departmentId);
  const accentBar = routeType === 'priority' ? 'bg-rose-500' : routeType === 'main' ? 'bg-sky-500' : 'bg-emerald-500';
  const TitleIcon = routeType === 'priority' ? Star : routeType === 'main' ? ListTodo : CheckSquare;
  const themeKey = routeType === 'priority' ? 'priority' : routeType === 'main' ? 'main' : 'todo';

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

    return {
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
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationMessage = firstWorkFormValidationMessage(validateAdjustWorkFormFields({
      isPriorityOrMain,
      isTodo,
      reason,
      priorityMainWorkItem: priorityMainForm.workItem,
      priorityMainDepartmentId: priorityMainForm.departmentId,
      todoWorkItem: todoForm.workItem,
      todoDepartmentId: todoForm.departmentId,
      cooperators: todoForm.cooperators,
    }));
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    setSubmitting(true);
    try {
      await submitAdjust(work, reason.trim(), buildPatch());
      alert('已提交调整申请，等待审批');
      router.push(`/${routeType}/${work.id}`);
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
          onChange={(cooperators) => setTodoForm((prev) => ({ ...prev!, cooperators }))}
          departments={cooperatorOptions}
        />
      )}
      {auxiliary}
    </>
  );

  return (
    <WorkFormShell
      backHref={`/${routeType}/${work.id}`}
      title={`申请调整${type}`}
      accentBar={accentBar}
      icon={<TitleIcon className="h-6 w-6" />}
      themeKey={themeKey}
      sidebar={sidebar}
      onSubmit={handleSubmit}
    >
      <WorkFormSectionCard title="调整申请">
        <div>
          <label className={FIELD_LABEL + ' mb-1 block'}>调整原因</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="请填写调整原因"
          />
        </div>
      </WorkFormSectionCard>

      {isPriorityOrMain && (
        <>
          <WorkFormSectionCard title="基本信息">
            <WorkItemField
              label="业务类别"
              value={priorityMainForm.businessCategory}
              onChange={(v) => setPriorityMainForm((prev) => ({ ...prev!, businessCategory: v }))}
              placeholder="请输入业务类别"
            />
            <WorkItemField
              label="工作事项"
              value={priorityMainForm.workItem}
              onChange={(v) => setPriorityMainForm((prev) => ({ ...prev!, workItem: v }))}
              placeholder="请输入工作事项"
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
              onChange={(v) => setPriorityMainForm((prev) => ({ ...prev!, planCompleteTime: v }))}
            />
            <WorkItemField
              label="完成形式"
              value={priorityMainForm.completeForm}
              onChange={(v) => setPriorityMainForm((prev) => ({ ...prev!, completeForm: v }))}
              placeholder="请输入完成形式"
            />
          </WorkFormSectionCard>

          <WorkFormSectionCard title="责任分工">
            <div className="flex gap-4 [&>div]:flex-1">
              <DepartmentField
                label="责任部门"
                value={priorityMainForm.departmentId}
                onChange={(v) => setPriorityMainForm((prev) => ({
                  ...prev!,
                  departmentId: v,
                  responsibleLeader: '',
                  responsiblePerson: '',
                  responsibleLeaderMemberId: undefined,
                  responsiblePersonMemberId: undefined,
                }))}
                departments={deptOptions}
                placeholder="请选择责任部门"
              />
              <ResponsibleFields
                leaderValue={priorityMainForm.responsibleLeader}
                onLeaderChange={(v) => setPriorityMainForm((prev) => ({ ...prev!, responsibleLeader: v }))}
                personValue={priorityMainForm.responsiblePerson}
                onPersonChange={(v) => setPriorityMainForm((prev) => ({ ...prev!, responsiblePerson: v }))}
                departmentId={Number(priorityMainForm.departmentId) || undefined}
                leaderMemberId={priorityMainForm.responsibleLeaderMemberId}
                onLeaderMemberIdChange={(id) => setPriorityMainForm((prev) => ({ ...prev!, responsibleLeaderMemberId: id }))}
                personMemberId={priorityMainForm.responsiblePersonMemberId}
                onPersonMemberIdChange={(id) => setPriorityMainForm((prev) => ({ ...prev!, responsiblePersonMemberId: id }))}
              />
            </div>
          </WorkFormSectionCard>
        </>
      )}

      {isTodo && (
        <>
          <WorkFormSectionCard title="基本信息">
            <ReadonlyInfo label="事项提出领导" value={work.proposedLeader} />
            <TodoSpecificFields
              proposedScene={todoForm.proposedScene}
              onProposedSceneChange={(v) => setTodoForm((prev) => ({ ...prev!, proposedScene: v }))}
              formedTime={todoForm.formedTime}
              onFormedTimeChange={(v) => setTodoForm((prev) => ({ ...prev!, formedTime: v }))}
              workPlan={todoForm.workPlan}
              onWorkPlanChange={(v) => setTodoForm((prev) => ({ ...prev!, workPlan: v }))}
              progress={todoForm.progress}
              onProgressChange={(v) => setTodoForm((prev) => ({ ...prev!, progress: v }))}
            />
            <WorkItemField
              label="待办事项"
              value={todoForm.workItem}
              onChange={(v) => setTodoForm((prev) => ({ ...prev!, workItem: v }))}
              placeholder="请输入待办事项"
            />
            <PlanCompleteTimeField
              label="完成时间"
              value={todoForm.planCompleteTime}
              onChange={(v) => setTodoForm((prev) => ({ ...prev!, planCompleteTime: v }))}
            />
          </WorkFormSectionCard>

          <WorkFormSectionCard title="责任分工">
            <div className="flex gap-4 [&>div]:flex-1">
              <DepartmentField
                label="主责部门"
                value={todoForm.departmentId ? String(todoForm.departmentId) : ''}
                onChange={(v) => setTodoForm((prev) => ({
                  ...prev!,
                  departmentId: v ? Number(v) : 0,
                  responsibleLeader: '',
                  responsiblePerson: '',
                  responsibleLeaderMemberId: undefined,
                  responsiblePersonMemberId: undefined,
                }))}
                departments={deptOptions}
                placeholder="请选择主责部门"
              />
              <ResponsibleFields
                leaderValue={todoForm.responsibleLeader}
                onLeaderChange={(v) => setTodoForm((prev) => ({ ...prev!, responsibleLeader: v }))}
                personValue={todoForm.responsiblePerson}
                onPersonChange={(v) => setTodoForm((prev) => ({ ...prev!, responsiblePerson: v }))}
                departmentId={todoForm.departmentId || undefined}
                leaderMemberId={todoForm.responsibleLeaderMemberId}
                onLeaderMemberIdChange={(id) => setTodoForm((prev) => ({ ...prev!, responsibleLeaderMemberId: id }))}
                personMemberId={todoForm.responsiblePersonMemberId}
                onPersonMemberIdChange={(id) => setTodoForm((prev) => ({ ...prev!, responsiblePersonMemberId: id }))}
              />
            </div>
          </WorkFormSectionCard>
        </>
      )}

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
          提交调整申请
        </Button>
      </div>
    </WorkFormShell>
  );
}
