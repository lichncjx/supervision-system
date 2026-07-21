'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, ListTodo, CheckSquare } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { isCompanyLevel } from '@/features/users/domain/role.rules';
import { getCompanyLeaders } from '@/features/users/client/user-api';
import { getDepartments } from '@/features/departments/client/department-api';
import { addWork } from '@/features/works/client/work-api';
import type { WorkType, WorkNode } from '@/features/works/client/work-client.types';
import { Button } from '@/components/ui/button';
import { WorkFormShell } from '@/features/works/ui/work-form-shell';
import { WorkFormSectionCard } from '@/features/works/ui/work-form-section-card';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import { WorkItemCombobox } from '@/features/works/ui/work-item-combobox';
import type { WorkItemOption } from '@/features/works/client/work-item-api';
import {
  WorkItemField,
  IsInnovationField,
  ProposedLeaderField,
  DepartmentField,
  ResponsibleFields,
  PlanCompleteTimeField,
  TodoSpecificFields,
} from '@/features/works/ui/work-form-fields';
import { validateCreateWorkFormFields, type CreateWorkFormField } from '@/features/works/client/work-form-validation';
import { buildCreateWorkPayload } from '@/features/works/client/build-create-work-payload';
import type { User } from '@/features/users/client/user-client.types';
import type { Department } from '@/features/departments/client/department-api';
import { ERROR_BOX, HINT_BOX, STICKY_ACTION_BAR } from '@/features/works/ui/visual-tokens';
import { getSystemSettings } from '@/features/system-settings/client/system-settings-api';

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

  const [companyLeaders, setCompanyLeaders] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

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
  const [workItemDefaultNotice, setWorkItemDefaultNotice] = useState('');

  const [nodes, setNodes] = useState<WorkNode[]>([]);

  // 重点工作和主要工作表单
  const [priorityMainForm, setPriorityMainForm] = useState({
    assessmentYear: String(new Date().getFullYear()),
    businessCategory: '',
    workItem: '',
    workNode: '',
    planCompleteTime: '',
    completeForm: '',
    departmentId: String(user?.departmentId || 2),
    responsibleLeader: '',
    responsiblePerson: '',
    responsibleLeaderUserId: undefined as number | undefined,
    responsiblePersonUserId: undefined as number | undefined,
  });

  // 待办事项表单
  const [todoForm, setTodoForm] = useState({
    assessmentYear: String(new Date().getFullYear()),
    proposedLeaderId:
      isCompanyLevel(user?.role)
        ? String(user?.id)
        : '',
    proposedScene: '',
    workItem: '',
    formedTime: '',
    departmentId: user?.departmentId && user.departmentId !== 1 ? user.departmentId : 0,
    responsibleLeader: '',
    responsiblePerson: '',
    responsibleLeaderUserId: undefined as number | undefined,
    responsiblePersonUserId: undefined as number | undefined,
    cooperators: [] as Array<{ departmentId: number; departmentName?: string; leaderMemberId?: number; leader?: string; personMemberId?: number; person?: string }>,
    workPlan: '',
    planCompleteTime: '',
    progress: '',
  });

  useEffect(() => {
    getSystemSettings().then((settings) => {
      const assessmentYear = String(settings.defaultAssessmentYear);
      setPriorityMainForm((current) => ({ ...current, assessmentYear }));
      setTodoForm((current) => ({ ...current, assessmentYear }));
    }).catch(() => undefined);
  }, []);

  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Partial<Record<CreateWorkFormField, string>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const applyExistingWorkItemDefaults = (option: WorkItemOption) => {
    setPriorityMainForm((current) => ({
      ...current,
      workItem: option.workItem,
      businessCategory: option.businessCategoryConsistent
        ? option.businessCategoryDefault || ''
        : current.businessCategory,
    }));
    if (routeType === 'priority' && option.isInnovationConsistent && option.isInnovationDefault !== null) {
      setIsInnovation(option.isInnovationDefault);
    }

    const inconsistentFields = [
      !option.businessCategoryConsistent && '业务类别',
      routeType === 'priority' && !option.isInnovationConsistent && '是否创新工作',
    ].filter(Boolean);
    setWorkItemDefaultNotice(
      inconsistentFields.length > 0
        ? `该工作事项的当前可见节点${inconsistentFields.join('、')}不一致，未自动带入，请确认后填写。`
        : routeType === 'priority'
          ? '已带入该工作事项当前可见节点一致的业务类别和是否创新工作。'
          : '已带入该工作事项当前可见节点一致的业务类别。',
    );
  };

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
      priorityMainAssessmentYear: s.priorityMainForm.assessmentYear,
      priorityMainWorkItem: s.priorityMainForm.workItem,
      priorityMainWorkNode: s.priorityMainForm.workNode,
      priorityMainDepartmentId: s.priorityMainForm.departmentId,
      todoAssessmentYear: s.todoForm.assessmentYear,
      todoWorkItem: s.todoForm.workItem,
      todoDepartmentId: s.todoForm.departmentId,
      todoProposedLeaderId: s.todoForm.proposedLeaderId,
      todoCooperators: s.todoForm.cooperators,
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

  useEffect(() => {
    if (!isPriorityOrMain || !user?.departmentId) return;
    if (user.role !== 'DEPARTMENT_MANAGER' && user.role !== 'DEPARTMENT_LEADER') return;
    setPriorityMainForm((current) => ({
      ...current,
      departmentId: String(user.departmentId),
    }));
  }, [isPriorityOrMain, user?.departmentId, user?.role]);


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

    try {
      const payload = buildCreateWorkPayload({
        type,
        user,
        priorityMainForm,
        todoForm,
        isInnovation,
        nodes,
        companyLeaders,
      });

      const createdWork = await addWork(payload);

      if (createdWork) {
        router.push(`/${routeType}/${createdWork.id}`);
      }
    } catch (error) {
      console.error(error);
      alert('创建失败，请查看控制台错误');
    }
  };

  const titleMap: Record<WorkType, string> = {
    重点: '新增重点工作节点',
    主要: '新增主要工作节点',
    待办: '新建待办事项',
  };

  const accentBar = routeType === 'priority' ? 'bg-rose-500' : routeType === 'main' ? 'bg-sky-500' : 'bg-emerald-500';
  const TitleIcon = routeType === 'priority' ? Star : routeType === 'main' ? ListTodo : CheckSquare;
  const themeKey = routeType === 'priority' ? 'priority' : routeType === 'main' ? 'main' : 'todo';

  const businessDepts = departments.filter((d) => d.isBusiness !== false);
  const isDepartmentUser = user?.role === 'DEPARTMENT_MANAGER' || user?.role === 'DEPARTMENT_LEADER';
  const deptOptions = isDepartmentUser
    ? businessDepts.filter((d) => d.id === user?.departmentId)
    : businessDepts;
  const showNodes = isPriorityOrMain || (isTodo && isDepartmentUser);

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
      {showNodes && (
        <>
          <WorkFormNodes
            nodes={nodes}
            onChange={setNodes}
            nodeLabel="任务分解节点（可选）"
            nodePlaceholderPrefix="任务分解节点"
            error={fieldError('nodes')}
            onTouched={() => handleBlur('nodes')}
            fieldId="field-nodes"
          />
          <p className="text-xs text-gray-400">如需拆解阶段任务，可添加节点；未添加节点不影响提交。</p>
        </>
      )}
      {isTodo && (
        <WorkFormCooperators
          cooperators={todoForm.cooperators}
          onChange={(cooperators) => setTodoForm({ ...todoForm, cooperators })}
          departments={businessDepts.filter((d) => d.id !== todoForm.departmentId)}
        />
      )}
      {draftHint}
    </>
  );

  return (
    <WorkFormShell
      backHref={`/${routeType}`}
      title={titleMap[type]}
      accentBar={accentBar}
      icon={<TitleIcon className="h-6 w-6" />}
      themeKey={themeKey}
      sidebar={sidebar}
      onSubmit={handleSubmit}
    >
      {errorSummary}

      {isPriorityOrMain && (
        <>
          <WorkFormSectionCard title="基本信息">
            <WorkItemField
              label="年度"
              value={priorityMainForm.assessmentYear}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, assessmentYear: v })}
              placeholder="例如：2026"
              error={fieldError('assessmentYear')}
              onBlur={() => handleBlur('assessmentYear')}
              fieldId="field-assessmentYear"
            />

            <WorkItemCombobox
              value={priorityMainForm.workItem}
              onChange={(v) => {
                setPriorityMainForm({ ...priorityMainForm, workItem: v });
                setWorkItemDefaultNotice('');
              }}
              onSelectExisting={applyExistingWorkItemDefaults}
              type={routeType === 'priority' ? 'priority' : 'main'}
              assessmentYear={priorityMainForm.assessmentYear}
              departmentId={priorityMainForm.departmentId}
              error={fieldError('workItem')}
              onBlur={() => handleBlur('workItem')}
              fieldId="field-workItem"
            />

            <WorkItemField
              label="业务类别"
              value={priorityMainForm.businessCategory}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, businessCategory: v })}
              placeholder="请输入业务类别"
            />

            {type === '重点' && (
              <IsInnovationField
                isInnovation={isInnovation}
                onChange={setIsInnovation}
              />
            )}

            {workItemDefaultNotice && (
              <p className="text-xs text-slate-500">{workItemDefaultNotice}</p>
            )}

            <div className="flex items-center gap-3 py-1" aria-label="工作节点属性">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold tracking-wide text-slate-500">工作节点属性</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <WorkItemField
              label="工作节点"
              value={priorityMainForm.workNode}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, workNode: v })}
              placeholder="请输入工作节点"
              error={fieldError('workNode')}
              onBlur={() => handleBlur('workNode')}
              fieldId="field-workNode"
            />

            <PlanCompleteTimeField
              label="完成时间"
              value={priorityMainForm.planCompleteTime}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, planCompleteTime: v })}
            />

            <WorkItemField
              label="完成形式"
              value={priorityMainForm.completeForm}
              onChange={(v) => setPriorityMainForm({ ...priorityMainForm, completeForm: v })}
              placeholder="请输入完成形式"
            />
          </WorkFormSectionCard>

          <WorkFormSectionCard title="责任分工">
            <div className="flex gap-4 [&>div]:flex-1">
              <DepartmentField
                label="责任部门"
                value={priorityMainForm.departmentId}
                onChange={(v) => setPriorityMainForm({
                  ...priorityMainForm,
                  departmentId: v,
                  responsibleLeader: '',
                  responsiblePerson: '',
                  responsibleLeaderUserId: undefined,
                  responsiblePersonUserId: undefined,
                })}
                departments={deptOptions}
                placeholder="请选择责任部门"
                error={fieldError('departmentId')}
                onBlur={() => handleBlur('departmentId')}
                fieldId="field-departmentId"
              />
              <ResponsibleFields
                leaderValue={priorityMainForm.responsibleLeader}
                onLeaderChange={(v) => setPriorityMainForm((prev) => ({ ...prev, responsibleLeader: v }))}
                personValue={priorityMainForm.responsiblePerson}
                onPersonChange={(v) => setPriorityMainForm((prev) => ({ ...prev, responsiblePerson: v }))}
                departmentId={Number(priorityMainForm.departmentId) || undefined}
                leaderUserId={priorityMainForm.responsibleLeaderUserId}
                onLeaderUserIdChange={(id) => setPriorityMainForm((prev) => ({ ...prev, responsibleLeaderUserId: id }))}
                personUserId={priorityMainForm.responsiblePersonUserId}
                onPersonUserIdChange={(id) => setPriorityMainForm((prev) => ({ ...prev, responsiblePersonUserId: id }))}
              />
            </div>
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
              disabled={isCompanyLevel(user?.role)}
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
              label="年度"
              value={todoForm.assessmentYear}
              onChange={(v) => setTodoForm({ ...todoForm, assessmentYear: v })}
              placeholder="例如：2026"
              error={fieldError('assessmentYear')}
              onBlur={() => handleBlur('assessmentYear')}
              fieldId="field-assessmentYear"
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
              label="完成时间"
              value={todoForm.planCompleteTime}
              onChange={(v) => setTodoForm({ ...todoForm, planCompleteTime: v })}
            />
          </WorkFormSectionCard>

          <WorkFormSectionCard title="责任分工">
            <div className="flex gap-4 [&>div]:flex-1">
              <DepartmentField
                label="主责部门"
                value={todoForm.departmentId ? String(todoForm.departmentId) : ''}
                onChange={(v) => {
                  const newDeptId = v ? Number(v) : 0
                  setTodoForm({
                    ...todoForm,
                    departmentId: newDeptId,
                    // Clear memberId and name snapshots when department changes.
                    responsibleLeader: '',
                    responsiblePerson: '',
                    responsibleLeaderUserId: undefined,
                    responsiblePersonUserId: undefined,
                  })
                }}
                departments={deptOptions}
                placeholder="请选择主责部门"
                error={fieldError('departmentId')}
                onBlur={() => handleBlur('departmentId')}
                fieldId="field-departmentId"
              />
              <ResponsibleFields
                leaderValue={todoForm.responsibleLeader}
                onLeaderChange={(v) => setTodoForm((prev) => ({ ...prev, responsibleLeader: v }))}
                personValue={todoForm.responsiblePerson}
                onPersonChange={(v) => setTodoForm((prev) => ({ ...prev, responsiblePerson: v }))}
                departmentId={todoForm.departmentId || undefined}
                leaderUserId={todoForm.responsibleLeaderUserId}
                onLeaderUserIdChange={(id) => setTodoForm((prev) => ({ ...prev, responsibleLeaderUserId: id }))}
                personUserId={todoForm.responsiblePersonUserId}
                onPersonUserIdChange={(id) => setTodoForm((prev) => ({ ...prev, responsiblePersonUserId: id }))}
              />
            </div>
          </WorkFormSectionCard>
        </>
      )}

      <div className={STICKY_ACTION_BAR}>
        <Link href={`/${routeType}`}>
          <Button variant="outline" type="button" className="rounded-full border-slate-200 bg-white/80">
            取消
          </Button>
        </Link>
        {isPriorityOrMain && (
          <Link href={`/${routeType}/batch-new`}>
            <Button variant="outline" type="button" className="rounded-full border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100">
              批量新增节点
            </Button>
          </Link>
        )}
        <Button type="submit" className="rounded-full bg-slate-950 px-5 text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800">
          保存草稿
        </Button>
      </div>
    </WorkFormShell>
  );
}
