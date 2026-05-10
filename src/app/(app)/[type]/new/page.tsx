'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, ListTodo, CheckSquare } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getCompanyLeaders, getDepartments, getUsersByDepartment } from '@/lib/auth';
import { addWork, submitWork, type WorkType, type WorkNode } from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSearchSelect } from '@/components/common/multi-search-select';

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
  const [departmentUsers, setDepartmentUsers] = useState<Record<number, Array<{ id: number; name: string; role: string; departmentId: number; departmentName?: string }>>>({});

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

  const [nodes, setNodes] = useState<WorkNode[]>([
    {
      id: Date.now(),
      title: '',
      completeTime: '',
      children: [],
    },
  ]);

  // 节点操作函数
  const addNode = () => {
    setNodes([
      ...nodes,
      {
        id: Date.now(),
        title: '',
        completeTime: '',
        children: [],
      },
    ]);
  };

  const updateNodeCompleteTime = (nodeId: number, completeTime: string) => {
    setNodes(nodes.map((node) =>
      node.id === nodeId ? { ...node, completeTime: completeTime } : node
    ));
  };

  const updateNodeTitle = (nodeId: number, title: string) => {
    setNodes(nodes.map((node) =>
      node.id === nodeId ? { ...node, title } : node
    ));
  };

  const deleteNode = (nodeId: number) => {
    setNodes(nodes.filter((node) => node.id !== nodeId));
  };

  const addSubNode = (nodeId: number) => {
    setNodes(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: [
              ...node.children,
              {
                id: Date.now(),
                title: '',
                completeTime: '',
              },
            ],
          }
        : node
    ));
  };

  const updateSubNodeTitle = (nodeId: number, subNodeId: number, title: string) => {
    setNodes(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: node.children.map((child) =>
              child.id === subNodeId ? { ...child, title } : child
            ),
          }
        : node
    ));
  };

  const deleteSubNode = (nodeId: number, subNodeId: number) => {
    setNodes(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: node.children.filter((child) => child.id !== subNodeId),
          }
        : node
    ));
  };

  const updateSubNodeCompleteTime = (nodeId: number, subNodeId: number, completeTime: string) => {
    setNodes(nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            children: node.children.map((child) =>
              child.id === subNodeId ? { ...child, completeTime: completeTime } : child
            ),
          }
        : node
    ));
  };

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
    responsibleDepartmentIds:
      user?.departmentId && user.departmentId !== 1
        ? [user.departmentId]
        : [],
    responsiblePersons: [] as string[],
    cooperateDepartmentIds: [] as number[],
    cooperatePersons: [] as string[],
    workPlan: '',
    planCompleteTime: '',
    progress: '',
  });

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
    const departmentId = Number(priorityMainForm.departmentId);
    if (departmentId && isPriorityOrMain) {
      const fetchDepartmentUsers = async () => {
        const users = await getUsersByDepartment(departmentId);
        setDepartmentUsers((prev) => ({ ...prev, [departmentId]: users }));
      };
      fetchDepartmentUsers();
    }
  }, [priorityMainForm.departmentId, isPriorityOrMain]);

  useEffect(() => {
    const fetchTodoDepartmentUsers = async () => {
      const selectedDepartmentIds = Array.from(
        new Set([...todoForm.responsibleDepartmentIds, ...todoForm.cooperateDepartmentIds]),
      );
      const missingDepartmentIds = selectedDepartmentIds.filter(
        (deptId) => !departmentUsers[deptId],
      );

      if (missingDepartmentIds.length === 0) {
        return;
      }

      const usersByDepartment = await Promise.all(
        missingDepartmentIds.map(async (deptId) => {
          const users = await getUsersByDepartment(deptId);
          return [deptId, users] as const;
        }),
      );

      setDepartmentUsers((prev) => {
        const next = { ...prev };
        usersByDepartment.forEach(([deptId, users]) => {
          next[deptId] = users;
        });
        return next;
      });
    };

    if (isTodo) {
      fetchTodoDepartmentUsers();
    }
  }, [todoForm.responsibleDepartmentIds, todoForm.cooperateDepartmentIds, departmentUsers, isTodo]);

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

    if (!user) {
      alert('请先登录');
      return;
    }

    if (isPriorityOrMain) {
      if (!priorityMainForm.workItem.trim()) {
        alert('请输入工作事项');
        return;
      }
      if (!priorityMainForm.departmentId) {
        alert('请选择责任部门');
        return;
      }
    } else if (isTodo) {
      if (!todoForm.workItem.trim()) {
        alert('请输入待办事项');
        return;
      }
      if (todoForm.responsibleDepartmentIds.length === 0) {
        alert('请选择主责部门');
        return;
      }
      if (!todoForm.proposedLeaderId) {
        alert('请选择事项提出领导');
        return;
      }
    }

    const selectedProposedLeader = isTodo
      ? companyLeaders.find((leader) => leader.id === Number(todoForm.proposedLeaderId))
      : null;

    if (isTodo && !selectedProposedLeader) {
      alert('请选择事项提出领导');
      return;
    }

    // 待办事项由部门发起时也必须填写节点
    const validNodes = nodes
      .filter((node) => node.title.trim())
      .map((node) => ({
        ...node,
        children: node.children.filter((child) => child.title.trim()),
      }));

    if (
      isTodo &&
      (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER')
    ) {
      if (validNodes.length === 0) {
        alert('请至少填写一个任务节点');
        return;
      }

      if (validNodes.some((node) => !node.completeTime)) {
        alert('请填写每个任务节点的完成时间');
        return;
      }
    }

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
        const cooperators = (todoForm.cooperateDepartmentIds || []).map((id: number) => {
              const dept = departments.find((d: any) => d.id === id);
              return {
                departmentId: id,
                departmentName: dept?.name || undefined,
                leader: undefined,
                person: undefined,
              };
            });
        createdWork = await addWork({
          id: Date.now(),
          title: todoForm.workItem,
          type: '待办',
          departmentId: todoForm.responsibleDepartmentIds[0] || 2,
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

      // 提交审批
      if (createdWork) {
        await submitWork(createdWork, user);
      }

      router.push(`/${routeType}`);
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

  const responsiblePersonOptions = todoForm.responsibleDepartmentIds.flatMap(
    (departmentId: number) => departmentUsers[departmentId] || []
  );
  const cooperatePersonOptions = todoForm.cooperateDepartmentIds.flatMap(
    (departmentId: number) => departmentUsers[departmentId] || []
  );
  const departmentOptions = departments.map((dept) => ({
    value: String(dept.id),
    label: dept.name,
  }));
  const responsiblePersonSelectOptions = responsiblePersonOptions.map((person) => ({
    value: person.name,
    label: person.name,
    description: person.departmentName || '-',
  }));
  const cooperatePersonSelectOptions = cooperatePersonOptions.map((person) => ({
    value: person.name,
    label: person.name,
    description: person.departmentName || '-',
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${routeType}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
          <span className={`w-1 h-6 rounded-full ${accentBar}`} />
          <TitleIcon className={`h-6 w-6 ${iconColor}`} />
          {titleMap[type]}
        </h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isPriorityOrMain && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">业务类别</label>
                  <Input 
                    value={priorityMainForm.businessCategory} 
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, businessCategory: e.target.value })} 
                    placeholder="请输入业务类别"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">工作事项</label>
                  <Input 
                    value={priorityMainForm.workItem} 
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, workItem: e.target.value })} 
                    placeholder="请输入工作事项"
                  />
                </div>

                {type === '重点' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">是否为创新工作</label>
                    <select
                      value={isInnovation ? '是' : '否'}
                      onChange={(e) => setIsInnovation(e.target.value === '是')}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="否">否</option>
                      <option value="是">是</option>
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">工作节点</label>
                    <Button type="button" variant="outline" size="sm" onClick={addNode}>
                      新增工作节点
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {nodes.map((node, nodeIndex) => (
                      <div key={node.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                        <div className="flex gap-2 items-center">
                          <Input
                            value={node.title}
                            onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                            placeholder={`工作节点${nodeIndex + 1}`}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-500">节点完成时间</span>
                          <Input
                            type="date"
                            value={node.completeTime || ''}
                            onChange={(e) => updateNodeCompleteTime(node.id, e.target.value)}
                            className="w-40"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteNode(node.id)}
                            disabled={nodes.length === 1}
                          >
                            删除节点
                          </Button>
                        </div>

                        <div className="pl-6 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">子节点</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addSubNode(node.id)}
                            >
                              新增子节点
                            </Button>
                          </div>

                          {node.children.length === 0 && (
                            <div className="text-sm text-gray-400">暂无子节点</div>
                          )}

                          {node.children.map((child, childIndex) => (
                            <div key={child.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 items-center">
                              <Input
                                value={child.title}
                                onChange={(e) =>
                                  updateSubNodeTitle(node.id, child.id, e.target.value)
                                }
                                placeholder={`子节点${childIndex + 1}`}
                                className="flex-1"
                              />

                              <Input
                                type="date"
                                value={child.completeTime || ''}
                                onChange={(e) =>
                                  updateSubNodeCompleteTime(node.id, child.id, e.target.value)
                                }
                                placeholder="完成日期"
                              />

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSubNode(node.id, child.id)}
                              >
                                删除
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">计划完成时间</label>
                  <Input 
                    type="date"
                    value={priorityMainForm.completeTime} 
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, completeTime: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">完成形式</label>
                  <Input 
                    value={priorityMainForm.completeForm} 
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, completeForm: e.target.value })} 
                    placeholder="请输入完成形式"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">责任部门</label>
                  <select
                    value={priorityMainForm.departmentId}
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, departmentId: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    责任领导
                    <span className="text-xs text-gray-400 ml-1">（姓名文本，仅用于展示和留痕）</span>
                  </label>
                  <Input
                    value={priorityMainForm.responsibleLeader}
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, responsibleLeader: e.target.value })}
                    placeholder="请输入责任领导姓名"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    责任人
                    <span className="text-xs text-gray-400 ml-1">（姓名文本，仅用于展示和留痕）</span>
                  </label>
                  <Input
                    value={priorityMainForm.responsiblePerson}
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, responsiblePerson: e.target.value })}
                    placeholder="请输入责任人姓名"
                  />
                </div>
              </>
            )}

            {isTodo && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    事项提出领导
                    <span className="text-xs text-gray-400 ml-1">（提出该待办事项的公司领导，默认也是审批领导）</span>
                  </label>
                  <select
                    value={todoForm.proposedLeaderId}
                    disabled={user?.role === 'VICE_PRESIDENT' || user?.role === 'PRESIDENT'}
                    onChange={(e) => setTodoForm({ ...todoForm, proposedLeaderId: e.target.value })}
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">请选择事项提出领导</option>
                    {companyLeaders.map((leader) => (
                      <option key={leader.id} value={leader.id}>
                        {leader.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">事项提出场景</label>
                  <Input 
                    value={todoForm.proposedScene} 
                    onChange={(e) => setTodoForm({ ...todoForm, proposedScene: e.target.value })} 
                    placeholder="请输入事项提出场景"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">待办事项</label>
                  <Input 
                    value={todoForm.workItem} 
                    onChange={(e) => setTodoForm({ ...todoForm, workItem: e.target.value })} 
                    placeholder="请输入待办事项"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">形成时间</label>
                  <Input 
                    type="date"
                    value={todoForm.formedTime} 
                    onChange={(e) => setTodoForm({ ...todoForm, formedTime: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">主责部门</label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={departmentOptions}
                    value={todoForm.responsibleDepartmentIds.map(String)}
                    onChange={(nextValues) => {
                      const nextDepartmentIds = nextValues.map(Number);
                      const nextDepartmentUserNames = new Set(
                        nextDepartmentIds.flatMap((deptId) =>
                          (departmentUsers[deptId] || []).map((person) => person.name),
                        ),
                      );

                      setTodoForm((prev) => ({
                        ...prev,
                        responsibleDepartmentIds: nextDepartmentIds,
                        responsiblePersons: prev.responsiblePersons.filter((personName) =>
                          nextDepartmentUserNames.has(personName),
                        ),
                      }));
                    }}
                    placeholder="请选择主责部门"
                    searchPlaceholder="搜索部门名称"
                    emptyText="未找到匹配部门"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    主责责任人
                    <span className="text-xs text-gray-400 ml-1">（主责部门的具体责任人）</span>
                  </label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={responsiblePersonSelectOptions}
                    value={todoForm.responsiblePersons}
                    onChange={(nextPersons) =>
                      setTodoForm((prev) => ({
                        ...prev,
                        responsiblePersons: nextPersons,
                      }))
                    }
                    placeholder={todoForm.responsibleDepartmentIds.length > 0 ? '请选择主责责任人' : '请先选择主责部门'}
                    searchPlaceholder="搜索姓名"
                    emptyText="未找到匹配责任人"
                    disabled={todoForm.responsibleDepartmentIds.length === 0}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    配合部门
                    <span className="text-xs text-gray-400 ml-1">（协助执行的部门）</span>
                  </label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={departmentOptions}
                    value={todoForm.cooperateDepartmentIds.map(String)}
                    onChange={(nextValues) => {
                      const nextDepartmentIds = nextValues.map(Number);
                      const nextDepartmentUserNames = new Set(
                        nextDepartmentIds.flatMap((deptId) =>
                          (departmentUsers[deptId] || []).map((person) => person.name),
                        ),
                      );

                      setTodoForm((prev) => ({
                        ...prev,
                        cooperateDepartmentIds: nextDepartmentIds,
                        cooperatePersons: prev.cooperatePersons.filter((personName) =>
                          nextDepartmentUserNames.has(personName),
                        ),
                      }));
                    }}
                    placeholder="请选择配合部门"
                    searchPlaceholder="搜索部门名称"
                    emptyText="未找到匹配部门"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    配合责任人
                    <span className="text-xs text-gray-400 ml-1">（配合部门的具体责任人）</span>
                  </label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={cooperatePersonSelectOptions}
                    value={todoForm.cooperatePersons}
                    onChange={(nextPersons) =>
                      setTodoForm((prev) => ({
                        ...prev,
                        cooperatePersons: nextPersons,
                      }))
                    }
                    placeholder={todoForm.cooperateDepartmentIds.length > 0 ? '请选择配合责任人' : '请先选择配合部门'}
                    searchPlaceholder="搜索姓名"
                    emptyText="未找到匹配责任人"
                    disabled={todoForm.cooperateDepartmentIds.length === 0}
                  />
                </div>

                {user && (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">任务节点</label>
                      <Button type="button" variant="outline" size="sm" onClick={addNode}>
                        新增任务节点
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {nodes.map((node, nodeIndex) => (
                        <div key={node.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                          <div className="flex gap-2 items-center">
                            <Input
                              value={node.title}
                              onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                              placeholder={`任务节点${nodeIndex + 1}`}
                              className="flex-1"
                            />
                            <span className="text-sm text-gray-500">节点完成时间</span>
                            <Input
                              type="date"
                              value={node.completeTime || ''}
                              onChange={(e) => updateNodeCompleteTime(node.id, e.target.value)}
                              className="w-40"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteNode(node.id)}
                              disabled={nodes.length === 1}
                            >
                              删除节点
                            </Button>
                          </div>

                          <div className="pl-6 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">子节点</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addSubNode(node.id)}
                              >
                                新增子节点
                              </Button>
                            </div>

                            {node.children.length === 0 && (
                              <div className="text-sm text-gray-400">暂无子节点</div>
                            )}

                            {node.children.map((child, childIndex) => (
                              <div
                                key={child.id}
                                className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2 items-center"
                              >
                                <Input
                                  value={child.title}
                                  onChange={(e) => updateSubNodeTitle(node.id, child.id, e.target.value)}
                                  placeholder={`子节点${childIndex + 1}`}
                                />

                                <Input
                                  type="date"
                                  value={child.completeTime || ''}
                                  onChange={(e) => updateSubNodeCompleteTime(node.id, child.id, e.target.value)}
                                />

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteSubNode(node.id, child.id)}
                                >
                                  删除
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">工作计划</label>
                  <Textarea 
                    value={todoForm.workPlan} 
                    onChange={(e) => setTodoForm({ ...todoForm, workPlan: e.target.value })} 
                    placeholder="请输入工作计划"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">计划完成时间</label>
                  <Input 
                    type="date"
                    value={todoForm.planCompleteTime} 
                    onChange={(e) => setTodoForm({ ...todoForm, planCompleteTime: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">进展情况</label>
                  <Textarea 
                    value={todoForm.progress} 
                    onChange={(e) => setTodoForm({ ...todoForm, progress: e.target.value })} 
                    placeholder="请输入进展情况"
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button type="submit">
                保存并提交
              </Button>
              <Link href={`/${routeType}`}>
                <Button variant="outline" type="button">取消</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
