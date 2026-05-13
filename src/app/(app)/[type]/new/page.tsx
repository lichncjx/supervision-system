'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, ListTodo, CheckSquare } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getCompanyLeaders, getDepartments } from '@/lib/auth';
import { addWork, type WorkType, type WorkNode } from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { WorkFormShell } from '@/features/works/ui/work-form-shell';
import { WorkFormSectionCard } from '@/features/works/ui/work-form-section-card';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import {
  WorkItemField,
  IsInnovationField,
  ProposedLeaderField,
  DepartmentField,
  ResponsibleFields,
  PlanCompleteTimeField,
  TodoSpecificFields,
} from '@/features/works/ui/work-form-fields';
import { validateCreateWorkFormFields, type CreateWorkFormField } from '@/features/works/ui/work-form-validations';
import { ERROR_BOX, HINT_BOX } from '@/features/works/ui/visual-tokens';

export default function NewWorkPage() {
  const params = useParams<{ type: string }>();
  const routeType = params?.type || 'todo';
  const router = useRouter();
  const { user } = useAuth();

  const typeMap: Record<string, WorkType> = {
    priority: '重点',
    main: '主要',
    todo: '待办',
  };

  const type = typeMap[routeType] || '待办';
  const isPriorityOrMain = type === '重点' || type === '主要';
  const isTodo = type === '待办';

  const [companyLeaders, setCompanyLeaders] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code: string; isBusiness: boolean }>>([]);

  const canCreateTodo =
    user?.role === 'ADMIN' ||
    user?.role === 'DEPARTMENT_MANAGER' ||
    user?.role === 'DEPARTMENT_LEADER' ||
    user?.role === 'VICE_PRESIDENT' ||
    user?.role === 'PRESIDENT' ||
    user?.role === 'SUPERVISOR';

  const canCreateWork =
    user?.role === 'ADMIN' ||
    user?.role === 'DEPARTMENT_MANAGER' ||
    user?.role === 'DEPARTMENT_LEADER' ||
    user?.role === 'SUPERVISOR';

  const [isInnovation, setIsInnovation] = useState(false);

  const [nodes, setNodes] = useState<WorkNode[]>([]);

  // 重点工作和主要工作表单
  const [priorityMainForm, setPriorityMainForm] = useState({
    businessCategory: '',
    workItem: '',
    workNode: '',
    completeTime: '',
    completeForm: '',
    departmentId: String(user?.departmentId || 2),
    responsibleLeader: '',
    responsiblePerson: '',
  });

  // 待办事项表单
  const [todoForm, setTodoForm] = useState({
    proposedLeaderId:
      user?.role === 'VICE_PRESIDENT' || user?.role === 'PRESIDENT'
        ? String(user.id)
        : '',
    proposedScene: '',
    workItem: '',
    formedTime: '',
    departmentId: user?.departmentId && user.departmentId !== 1 ? user.departmentId : 0,
    responsibleLeader: '',
    responsiblePerson: '',
    cooperators: [] as Array<{ departmentId: number; departmentName?: string; leader?: string; person?: string }>,
    workPlan: '',
    planCompleteTime: '',
    progress: '',
  });

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Partial<Record<CreateWorkFormField, string>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const stateRef = useRef({
    priorityMainForm,
    todoForm,
    nodes,
    isInnovation,
    companyLeaders,
    user,
    isPriorityOrMain,
    isTodo,
  });
  stateRef.current = {
    priorityMainForm,
    todoForm,
    nodes,
    isInnovation,
    companyLeaders,
    user,
    isPriorityOrMain,
    isTodo,
  };

  const runValidation = useCallback(() => {
    const s = stateRef.current;
    if (!s.user) return {};
    return validateCreateWorkFormFields({
      user: s.user,
      isPriorityOrMain: s.isPriorityOrMain,
      isTodo: s.isTodo,
      priorityMainWorkItem: s.priorityMainForm.workItem,
      priorityMainDepartmentId: s.priorityMainForm.departmentId,
      todoWorkItem: s.todoForm.workItem,
      todoDepartmentId: s.todoForm.departmentId,
      todoProposedLeaderId: s.todoForm.proposedLeaderId,
      companyLeaders: s.companyLeaders,
      nodes: s.nodes,
    });
  }, []);

  const handleBlur = (field: CreateWorkFormField) => {
    setTouched((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    const nextErrors = runValidation();
    setErrors(nextErrors);
  };

  const fieldError = (field: CreateWorkFormField) => {
    if (!errors[field]) return undefined;
    if (submitAttempted || touched.has(field)) return errors[field];
    return undefined;
  };

  useEffect(() => {
    const fetchData = async () => {
      const [leaders, depts] = await Promise.all([
        getCompanyLeaders(),
        getDepartments(),
      ]);
      setCompanyLeaders(leaders);
      setDepartments(depts.filter((d: any) => d.isBusiness));
    };
    fetchData();
  }, []);


  if (type === '待办' && !canCreateTodo) {
    return (
      <div className="p-8 text-center text-red-600">
        无权限新建待办事项。部门领导和部门主管只能查看或上传见证材料。
      </div>
    );
  }

  if ((type === '重点' || type === '主要') && !canCreateWork) {
    return (
      <div className="p-8 text-center text-red-600">
        无权限新建该事项
      </div>
    );
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = runValidation();
    setErrors(nextErrors);
    setSubmitAttempted(true);

    const errorKeys = Object.keys(nextErrors) as CreateWorkFormField[];
    if (errorKeys.length > 0) {
      const firstField = errorKeys[0];
      const el = document.getElementById(`field-${firstField}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!user) return;

    const selectedProposedLeader = isTodo
      ? companyLeaders.find((leader) => leader.id === Number(todoForm.proposedLeaderId))
      : null;

    // 过滤掉标题为空的节点
    const validNodes = nodes
      .filter((node) => node.title.trim())
      .map((node) => ({
        ...node,
        children: node.children.filter((child) => child.title.trim()),
      }));

    try {
      let createdWork;
      if (isPriorityOrMain) {
        createdWork = await addWork({
          id: Date.now(),
          title: priorityMainForm.workItem,
          type,
          departmentId: Number(priorityMainForm.departmentId),
          creatorRole: user.role,
          creatorId: user.id,
          action: 'create',
          status: 'draft',
          needCeo: type === '重点',
          isInnovation: type === '重点' ? isInnovation : false,
          nodes: nodes.filter((node) => node.title.trim()).map((node) => ({
            ...node,
            children: node.children.filter((child) => child.title.trim()),
          })),
          businessCategory: priorityMainForm.businessCategory,
          workItem: priorityMainForm.workItem,
          workNode: priorityMainForm.workNode,
          completeTime: priorityMainForm.completeTime,
          completeForm: priorityMainForm.completeForm,
          responsibleLeader: priorityMainForm.responsibleLeader,
          responsiblePerson: priorityMainForm.responsiblePerson,
        });
      } else if (isTodo) {
        const cooperators = todoForm.cooperators.filter((c) => c.departmentId > 0);
        createdWork = await addWork({
          id: Date.now(),
          title: todoForm.workItem,
          type: '待办',
          departmentId: todoForm.departmentId || 2,
          creatorRole: user.role,
          creatorId: user.id,
          action: 'todo_decompose',
          status: 'draft',
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
        });
      }

      // 保存草稿
      if (createdWork) {
        router.push(`/${routeType}/${createdWork.id}`);
      }
    } catch (error) {
      console.error(error);
      alert('创建失败，请查看控制台错误');
    }
  };

  const titleMap: Record<WorkType, string> = {
    重点: '新建重点工作',
    主要: '新建主要工作',
    待办: '新建待办事项',
  };

  const accentBar = routeType === 'priority' ? 'bg-rose-500' : routeType === 'main' ? 'bg-sky-500' : 'bg-emerald-500';
  const iconColor = routeType === 'priority' ? 'text-rose-500' : routeType === 'main' ? 'text-sky-500' : 'text-emerald-500';
  const TitleIcon = routeType === 'priority' ? Star : routeType === 'main' ? ListTodo : CheckSquare;

  const businessDepts = departments.filter((d) => d.isBusiness !== false);

  const draftHint = (
    <div className={HINT_BOX}>
      <p className="font-medium text-slate-700 mb-1">保存草稿提示</p>
      <ul className="list-disc list-inside space-y-0.5">
        <li>保存草稿后，可在详情页继续完善信息、上传附件，并提交审批。</li>
        <li>责任领导、责任人仅用于业务留痕，不决定审批去向。</li>
        <li>部门主管提交后由本部门领导审批，再由公司领导审批；部门领导提交后由公司领导审批。</li>
        <li>公司领导发起的待办事项直接进入待分解。</li>
      </ul>
    </div>
  );

  const errorSummary =
    submitAttempted && Object.keys(errors).length > 0 ? (
      <div className={ERROR_BOX}>
        <p className="font-semibold mb-2">请完善以下信息后再提交</p>
        <ul className="list-disc list-inside space-y-0.5">
          {Object.values(errors).map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </div>
    ) : null;

  const sidebar = (
    <>
      {isPriorityOrMain && (
        <>
          <WorkFormNodes
            nodes={nodes}
            onChange={setNodes}
            nodeLabel="工作节点（可选）"
            addButtonLabel="新增工作节点"
            nodePlaceholderPrefix="工作节点"
            error={fieldError('nodes')}
            onTouched={() => handleBlur('nodes')}
            fieldId="field-nodes"
          />
          <p className="text-xs text-gray-400">如需拆解阶段任务，可添加节点；未添加节点不影响提交。</p>
        </>
      )}
      {isTodo && user && (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') && (
        <>
          <WorkFormNodes
            nodes={nodes}
            onChange={setNodes}
            nodeLabel="任务节点（可选）"
            addButtonLabel="新增任务节点"
            nodePlaceholderPrefix="任务节点"
            error={fieldError('nodes')}
            onTouched={() => handleBlur('nodes')}
            fieldId="field-nodes"
          />
          <p className="text-xs text-gray-400">如需拆解阶段任务，可添加节点；未添加节点不影响提交。</p>
        </>
      )}
      {draftHint}
    </>
  );

  return (
    <WorkFormShell
      backHref={`/${routeType}`}
      title={titleMap[type]}
      accentBar={accentBar}
      icon={<TitleIcon className={`h-6 w-6 ${iconColor}`} />}
      sidebar={sidebar}
      onSubmit={handleSubmit}
    >
      {errorSummary}

      {isPriorityOrMain && (
        <>
          <WorkFormSectionCard title="基本信息">
            <WorkItemField
              label="业务类别"
              value={priorityMainForm.businessCategory}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, businessCategory: v })}
              placeholder="请输入业务类别"
            />

            <WorkItemField
              label="工作事项"
              value={priorityMainForm.workItem}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, workItem: v })}
              placeholder="请输入工作事项"
              error={fieldError('workItem')}
              onBlur={() => handleBlur('workItem')}
              fieldId="field-workItem"
            />

            {type === '重点' && (
              <IsInnovationField
                isInnovation={isInnovation}
                onChange={setIsInnovation}
              />
            )}

            <PlanCompleteTimeField
              label="计划完成时间"
              value={priorityMainForm.completeTime}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, completeTime: v })}
            />

            <WorkItemField
              label="完成形式"
              value={priorityMainForm.completeForm}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, completeForm: v })}
              placeholder="请输入完成形式"
            />
          </WorkFormSectionCard>

          <WorkFormSectionCard title="责任分工">
            <DepartmentField
              label="责任部门"
              value={priorityMainForm.departmentId}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, departmentId: v })}
              departments={departments}
              error={fieldError('departmentId')}
              onBlur={() => handleBlur('departmentId')}
              fieldId="field-departmentId"
            />

            <ResponsibleFields
              leaderValue={priorityMainForm.responsibleLeader}
              onLeaderChange={(v) => setPriorityMainForm({ ...priorityMainForm, responsibleLeader: v })}
              personValue={priorityMainForm.responsiblePerson}
              onPersonChange={(v) => setPriorityMainForm({ ...priorityMainForm, responsiblePerson: v })}
            />
          </WorkFormSectionCard>
        </>
      )}

      {isTodo && (
        <>
          <WorkFormSectionCard title="基本信息">
            <ProposedLeaderField
              value={todoForm.proposedLeaderId}
              onChange={(v) => setTodoForm({ ...todoForm, proposedLeaderId: v })}
              leaders={companyLeaders}
              disabled={user?.role === 'VICE_PRESIDENT' || user?.role === 'PRESIDENT'}
              error={fieldError('proposedLeaderId')}
              onBlur={() => handleBlur('proposedLeaderId')}
              fieldId="field-proposedLeaderId"
            />

            <TodoSpecificFields
              proposedScene={todoForm.proposedScene}
              onProposedSceneChange={(v) => setTodoForm({ ...todoForm, proposedScene: v })}
              formedTime={todoForm.formedTime}
              onFormedTimeChange={(v) => setTodoForm({ ...todoForm, formedTime: v })}
              workPlan={todoForm.workPlan}
              onWorkPlanChange={(v) => setTodoForm({ ...todoForm, workPlan: v })}
              progress={todoForm.progress}
              onProgressChange={(v) => setTodoForm({ ...todoForm, progress: v })}
            />

            <WorkItemField
              label="待办事项"
              value={todoForm.workItem}
              onChange={(v) => setTodoForm({ ...todoForm, workItem: v })}
              placeholder="请输入待办事项"
              error={fieldError('workItem')}
              onBlur={() => handleBlur('workItem')}
              fieldId="field-workItem"
            />

            <PlanCompleteTimeField
              label="计划完成时间"
              value={todoForm.planCompleteTime}
              onChange={(v) => setTodoForm({ ...todoForm, planCompleteTime: v })}
            />
          </WorkFormSectionCard>

          <WorkFormSectionCard title="责任分工">
            <DepartmentField
              label="主责部门"
              value={todoForm.departmentId ? String(todoForm.departmentId) : ''}
              onChange={(v) => setTodoForm({ ...todoForm, departmentId: v ? Number(v) : 0 })}
              departments={businessDepts}
              placeholder="请选择主责部门"
              error={fieldError('departmentId')}
              onBlur={() => handleBlur('departmentId')}
              fieldId="field-departmentId"
            />

            <ResponsibleFields
              leaderValue={todoForm.responsibleLeader}
              onLeaderChange={(v) => setTodoForm({ ...todoForm, responsibleLeader: v })}
              personValue={todoForm.responsiblePerson}
              onPersonChange={(v) => setTodoForm({ ...todoForm, responsiblePerson: v })}
            />

            {/* 配合方 */}
            <WorkFormCooperators
              cooperators={todoForm.cooperators}
              onChange={(cooperators) => setTodoForm({ ...todoForm, cooperators })}
              departments={businessDepts}
            />
          </WorkFormSectionCard>
        </>
      )}

      <div className="flex gap-3">
        <Button type="submit">
          保存草稿
        </Button>
        <Link href={`/${routeType}`}>
          <Button variant="outline" type="button">取消</Button>
        </Link>
      </div>
    </WorkFormShell>
  );
}
