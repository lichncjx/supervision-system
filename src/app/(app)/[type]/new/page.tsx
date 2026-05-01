'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, Upload, Download, FileDown } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { departments, departmentLeadersStatic, departmentManagersStatic, getUsersByDepartmentStatic, companyLeadersStatic } from '@/lib/auth';
import { addWork, getVisibleWorks, type WorkType, type WorkNode } from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  downloadExcelTemplate,
  exportWorksToExcel,
  importWorksFromExcel,
  type ExcelRouteType,
} from '@/lib/excel-utils';

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

  const excelRouteType =
    routeType === 'priority' || routeType === 'main' || routeType === 'todo'
      ? routeType
      : 'todo';
  
  const companyLeaders = companyLeadersStatic;

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
    supervisor: '',
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
    departmentIds:
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

  // 多选下拉框取值函数
  function getSelectedNumbers(options: HTMLCollectionOf<HTMLOptionElement>) {
    return Array.from(options).map((option) => Number(option.value));
  }

  function getSelectedStrings(options: HTMLCollectionOf<HTMLOptionElement>) {
    return Array.from(options).map((option) => option.value);
  }

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

  const handleDownloadTemplate = () => {
    downloadExcelTemplate(excelRouteType);
  };

  const handleExportExcel = async () => {
    if (!user) return;
    const works = await getVisibleWorks(user, type);
    exportWorksToExcel(excelRouteType, works);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      alert('请先登录');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // 文件格式校验
    const allowedExtensions = ['xlsx', 'xls', 'csv'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      alert('仅支持上传 .xlsx、.xls、.csv 文件。如使用 WPS 表格，请先另存为 Excel 工作簿后再上传。');
      return;
    }

    try {
      const importedWorks = await importWorksFromExcel(file, excelRouteType, user);

      if (importedWorks.length === 0) {
        alert('未读取到有效数据，请检查Excel表头和内容');
        return;
      }

      importedWorks.forEach((work) => addWork(work));

      alert(`成功导入 ${importedWorks.length} 条数据`);
      router.push(`/${routeType}`);
    } catch (error) {
      console.error(error);
      alert('导入失败，请确认文件格式为 .xlsx，且表头正确');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      if (todoForm.departmentIds.length === 0) {
        alert('请选择责任部门');
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

    if (isPriorityOrMain) {
      addWork({
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
        supervisor: priorityMainForm.supervisor,
      });
    } else if (isTodo) {
      addWork({
        id: Date.now(),
        title: todoForm.workItem,
        type: '待办',
        departmentId: todoForm.departmentIds[0] || 2,
        departmentIds: todoForm.departmentIds,
        creatorRole: user.role,
        creatorId: user.id,
        action: 'todo_decompose',
        status: 'draft',
        needCeo: false,
        proposedLeader: selectedProposedLeader?.name || '',
        proposedLeaderId: selectedProposedLeader?.id,
        proposedLeaderRole: selectedProposedLeader?.role,
        proposedScene: todoForm.proposedScene,
        workItem: todoForm.workItem,
        formedTime: todoForm.formedTime,
        responsiblePersons: todoForm.responsiblePersons,
        responsiblePerson: todoForm.responsiblePersons.join('、'),
        cooperateDepartmentIds: todoForm.cooperateDepartmentIds,
        cooperateDepartments: todoForm.cooperateDepartmentIds
          .map((id) => departments.find((d) => d.id === id)?.name)
          .filter(Boolean) as string[],
        cooperateDepartment: todoForm.cooperateDepartmentIds
          .map((id) => departments.find((d) => d.id === id)?.name)
          .filter(Boolean)
          .join('、'),
        cooperatePersons: todoForm.cooperatePersons,
        cooperatePerson: todoForm.cooperatePersons.join('、'),
        workPlan: todoForm.workPlan,
        planCompleteTime: todoForm.planCompleteTime,
        progress: todoForm.progress,
        nodes: validNodes,
      });
    }

    router.push(`/${routeType}`);
  };

  const titleMap: Record<WorkType, string> = {
    重点: '新建重点工作',
    主要: '新建主要工作',
    待办: '新建待办事项',
  };

  const responsiblePersonOptions = todoForm.departmentIds
    .flatMap((departmentId: number) => getUsersByDepartmentStatic(departmentId));
  const cooperatePersonOptions = todoForm.cooperateDepartmentIds
    .flatMap((departmentId: number) => getUsersByDepartmentStatic(departmentId));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${routeType}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{titleMap[type]}</h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            下载模板
          </Button>

          <label className="inline-flex items-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportExcel}
            />
            <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
              <Upload className="h-4 w-4 mr-1" />
              导入Excel
            </span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            支持格式：.xlsx、.xls、.csv。<br />
            如使用 WPS 表格，请先另存为 Excel 工作簿后再上传。
          </p>

          <Button type="button" variant="outline" size="sm" onClick={handleExportExcel}>
            <FileDown className="h-4 w-4 mr-1" />
            导出Excel
          </Button>
        </div>
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
                  <label className="block text-sm font-medium mb-1">完成时间</label>
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
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, departmentId: e.target.value, responsibleLeader: '', supervisor: '' })} 
                    className="w-full border rounded-md p-2"
                  >
                    {departments.filter((d) => d.id !== 1).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">责任领导</label>
                  <select 
                    value={priorityMainForm.responsibleLeader} 
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, responsibleLeader: e.target.value })} 
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">请选择责任领导</option>
                    {departmentLeadersStatic.filter((u: any) => u.departmentId === Number(priorityMainForm.departmentId)).map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">主管人员</label>
                  <select 
                    value={priorityMainForm.supervisor} 
                    onChange={(e) => setPriorityMainForm({ ...priorityMainForm, supervisor: e.target.value })} 
                    className="w-full border rounded-md p-2"
                  >
                    <option value="">请选择主管人员</option>
                    {departmentManagersStatic.filter((u: any) => u.departmentId === Number(priorityMainForm.departmentId)).map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {isTodo && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">事项提出领导</label>
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
                  <label className="text-sm font-medium">责任部门</label>
                  <select
                    multiple
                    size={5}
                    className="mt-2 w-full border rounded-md px-3 py-2 text-sm"
                    value={todoForm.departmentIds.map(String)}
                    onChange={(e) => {
                      const nextDepartmentIds = getSelectedNumbers(e.currentTarget.selectedOptions);

                      setTodoForm((prev) => ({
                        ...prev,
                        departmentIds: nextDepartmentIds,
                        responsiblePersons: [],
                      }));
                    }}
                  >
                    {departments.filter((d) => d.id !== 1).map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">可按住 Ctrl 多选</p>
                </div>

                <div>
                  <label className="text-sm font-medium">责任部门责任人</label>
                  <select
                    multiple
                    size={5}
                    className="mt-2 w-full border rounded-md px-3 py-2 text-sm"
                    value={todoForm.responsiblePersons}
                    onChange={(e) => {
                      const nextPersons = getSelectedStrings(e.currentTarget.selectedOptions);

                      setTodoForm((prev) => ({
                        ...prev,
                        responsiblePersons: nextPersons,
                      }));
                    }}
                  >
                    {responsiblePersonOptions.map((person) => (
                      <option key={person.id} value={person.name}>
                        {person.name}（{departments.find((d) => d.id === person.departmentId)?.name || '-'}）
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">先选择责任部门，再选择责任人，可按住 Ctrl 多选</p>
                </div>

                <div>
                  <label className="text-sm font-medium">配合部门（可不填）</label>
                  <select
                    multiple
                    size={5}
                    className="mt-2 w-full border rounded-md px-3 py-2 text-sm"
                    value={todoForm.cooperateDepartmentIds.map(String)}
                    onChange={(e) => {
                      const nextDepartmentIds = getSelectedNumbers(e.currentTarget.selectedOptions);

                      setTodoForm((prev) => ({
                        ...prev,
                        cooperateDepartmentIds: nextDepartmentIds,
                        cooperatePersons: [],
                      }));
                    }}
                  >
                    {departments.filter((d) => d.id !== 1).map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">可按住 Ctrl 多选</p>
                </div>

                <div>
                  <label className="text-sm font-medium">配合部门责任人（可不填）</label>
                  <select
                    multiple
                    size={5}
                    className="mt-2 w-full border rounded-md px-3 py-2 text-sm"
                    value={todoForm.cooperatePersons}
                    onChange={(e) => {
                      const nextPersons = getSelectedStrings(e.currentTarget.selectedOptions);

                      setTodoForm((prev) => ({
                        ...prev,
                        cooperatePersons: nextPersons,
                      }));
                    }}
                  >
                    {cooperatePersonOptions.map((person) => (
                      <option key={person.id} value={person.name}>
                        {person.name}（{departments.find((d) => d.id === person.departmentId)?.name || '-'}）
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">先选择配合部门，再选择配合部门责任人，可按住 Ctrl 多选</p>
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
                <Save className="h-4 w-4 mr-2" />
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
