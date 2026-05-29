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
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import { WorkFormContent } from '@/features/works/ui/work-form-content';
import { validateCreateWorkFormFields, type CreateWorkFormField } from '@/features/works/ui/work-form-validations';
import { buildCreateWorkPayload } from '@/features/works/client/build-create-work-payload';
import type { User } from '@/features/users/client/user-client.types';
import type { Department } from '@/features/departments/client/department-api';
import { ERROR_BOX, HINT_BOX, STICKY_ACTION_BAR } from '@/features/works/ui/visual-tokens';

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

  const [nodes, setNodes] = useState<WorkNode[]>([]);

  // 重点工作和主要工作表单
  const [priorityMainForm, setPriorityMainForm] = useState({
    businessCategory: '',
    workItem: '',
    workNode: '',
    planCompleteTime: '',
    completeForm: '',
    departmentId: String(user?.departmentId || 2),
    responsibleLeader: '',
    responsiblePerson: '',
    responsibleLeaderMemberId: undefined as number | undefined,
    responsiblePersonMemberId: undefined as number | undefined,
  });

  // 待办事项表单
  const [todoForm, setTodoForm] = useState({
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
    responsibleLeaderMemberId: undefined as number | undefined,
    responsiblePersonMemberId: undefined as number | undefined,
    cooperators: [] as Array<{ departmentId: number; departmentName?: string; leaderMemberId?: number; leader?: string; personMemberId?: number; person?: string }>,
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

    // Validate no department appears twice (main dept vs cooperators)
    if (isTodo && todoForm.departmentId) {
      const coopIds = todoForm.cooperators
        .map((c) => c.departmentId)
        .filter((id) => id > 0)
      const dupIds = coopIds.filter((id) => id === todoForm.departmentId)
      if (dupIds.length > 0) {
        alert('主责部门不能同时作为配合部门，请修改')
        return
      }
      const seen = new Set<number>()
      for (const id of coopIds) {
        if (seen.has(id)) {
          alert('同一部门不能重复添加为配合方，请修改')
          return
        }
        seen.add(id)
      }
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
    重点: '新建重点工作',
    主要: '新建主要工作',
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
            nodeLabel={isPriorityOrMain ? '工作节点（可选）' : '任务节点（可选）'}
            nodePlaceholderPrefix={isPriorityOrMain ? '工作节点' : '任务节点'}
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

      <WorkFormContent
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
        workItemError={fieldError('workItem')}
        departmentError={fieldError('departmentId')}
        proposedLeaderError={fieldError('proposedLeaderId')}
        onWorkItemBlur={() => handleBlur('workItem')}
        onDepartmentBlur={() => handleBlur('departmentId')}
        onProposedLeaderBlur={() => handleBlur('proposedLeaderId')}
      />

      <div className={STICKY_ACTION_BAR}>
        <Link href={`/${routeType}`}>
          <Button variant="outline" type="button" className="rounded-full border-slate-200 bg-white/80">
            取消
          </Button>
        </Link>
        <Button type="submit" className="rounded-full bg-slate-950 px-5 text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800">
          保存草稿
        </Button>
      </div>
    </WorkFormShell>
  );
}
