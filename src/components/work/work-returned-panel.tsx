'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MultiSearchSelect } from '@/components/common/multi-search-select';
import { getUsersByDepartment } from '@/lib/auth';

interface WorkReturnedPanelProps {
  visible: boolean;
  rejectReason: string;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  editForm: any;
  setEditForm: (form: any) => void;
  editReason: string;
  setEditReason: (reason: string) => void;
  isPriorityOrMain: boolean;
  isTodo: boolean;
  departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
  companyLeaders: Array<{ id: number; name: string; role: string }>;
  // Phase 2: department leaders/managers for Priority/Main dropdowns
  departmentLeaders?: Array<{ id: number; name: string; role: string; departmentId: number }>;
  departmentManagers?: Array<{ id: number; name: string; role: string; departmentId: number }>;
  onResubmit: () => void;
  onDelete: () => void;
  updateNodeTitle: (nodeId: number, title: string) => void;
  updateNodeCompleteTime: (nodeId: number, completeTime: string) => void;
  deleteNode: (nodeId: number) => void;
  addNode: () => void;
  addSubNode: (nodeId: number) => void;
  updateSubNodeTitle: (nodeId: number, subNodeId: number, title: string) => void;
  updateSubNodeCompleteTime: (nodeId: number, subNodeId: number, completeTime: string) => void;
  deleteSubNode: (nodeId: number, subNodeId: number) => void;
}

export function WorkReturnedPanel({
  visible,
  rejectReason,
  editMode,
  setEditMode,
  editForm,
  setEditForm,
  editReason,
  setEditReason,
  isPriorityOrMain,
  isTodo,
  departments,
  companyLeaders,
  departmentLeaders,
  departmentManagers,
  onResubmit,
  onDelete,
  updateNodeTitle,
  updateNodeCompleteTime,
  deleteNode,
  addNode,
  addSubNode,
  updateSubNodeTitle,
  updateSubNodeCompleteTime,
  deleteSubNode,
}: WorkReturnedPanelProps) {
  const [departmentUsers, setDepartmentUsers] = useState<
    Record<number, Array<{ id: number; name: string; role: string; departmentId: number; departmentName?: string }>>
  >({});

  // Phase 4A: 加载 TODO 编辑所需的部门用户数据
  useEffect(() => {
    if (!isTodo) return;
    if (!editForm.departmentIds?.length && !editForm.cooperateDepartmentIds?.length) return;

    const allDeptIds = Array.from(
      new Set([...(editForm.departmentIds || []), ...(editForm.cooperateDepartmentIds || [])]),
    );
    const missing = allDeptIds.filter((deptId: number) => !departmentUsers[deptId]);
    if (missing.length === 0) return;

    Promise.all(missing.map(async (deptId: number) => {
      const users = await getUsersByDepartment(deptId);
      return [deptId, users] as const;
    })).then((results) => {
      setDepartmentUsers((prev) => {
        const next = { ...prev };
        results.forEach(([deptId, users]) => { next[deptId] = users; });
        return next;
      });
    });
  }, [editForm.departmentIds, editForm.cooperateDepartmentIds, isTodo]);

  // Phase 4A: 人员选项（和新建页一致，按当前选中部门的人员姓名生成）
  const businessDepts = departments.filter((d) => d.isBusiness !== false);
  const departmentOptions = businessDepts.map((dept) => ({
    value: String(dept.id),
    label: dept.name,
  }));
  const responsiblePersonOptions = (editForm.departmentIds || []).flatMap(
    (deptId: number) => (departmentUsers[deptId] || []).map((person) => ({
      value: person.name,
      label: person.name,
      description: person.departmentName || '-',
    })),
  );
  const cooperatePersonOptions = (editForm.cooperateDepartmentIds || []).flatMap(
    (deptId: number) => (departmentUsers[deptId] || []).map((person) => ({
      value: person.name,
      label: person.name,
      description: person.departmentName || '-',
    })),
  );

  if (!visible) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>退回事项处理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rejectReason && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded break-words whitespace-pre-wrap">
            退回原因：{rejectReason}
          </div>
        )}

        {!editMode ? (
          <div className="flex gap-3">
            <Button onClick={() => setEditMode(true)}>
              修改后重新提交
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              删除退回事项
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isPriorityOrMain && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">工作事项</label>
                  <Input
                    value={editForm.workItem || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">业务类别</label>
                  <Input
                    value={editForm.businessCategory || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, businessCategory: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">计划完成时间</label>
                  <Input
                    type="date"
                    value={editForm.completeTime || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, completeTime: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">完成形式</label>
                  <Input
                    value={editForm.completeForm || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, completeForm: e.target.value }))}
                  />
                </div>

                {departmentLeaders && departmentLeaders.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">部门领导</label>
                    <select
                      value={editForm.deptLeaderId || ''}
                      onChange={(e) => {
                        const selected = departmentLeaders.find(u => String(u.id) === e.target.value);
                        setEditForm((prev: any) => ({ ...prev, deptLeaderId: e.target.value, responsibleLeader: selected?.name || '' }));
                      }}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">请选择部门领导</option>
                      {departmentLeaders.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {departmentManagers && departmentManagers.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">主管人员</label>
                    <select
                      value={editForm.deptManagerId || ''}
                      onChange={(e) => {
                        const selected = departmentManagers.find(u => String(u.id) === e.target.value);
                        setEditForm((prev: any) => ({ ...prev, deptManagerId: e.target.value, supervisor: selected?.name || '' }));
                      }}
                      className="w-full border rounded-md p-2"
                    >
                      <option value="">请选择主管人员</option>
                      {departmentManagers.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {isTodo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    事项提出领导
                    <span className="text-xs text-gray-400 ml-1">（提出该待办事项的公司领导，默认也是审批领导）</span>
                  </label>
                  <select
                    value={editForm.proposedLeaderId || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedLeaderId: e.target.value }))}
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
                  <label className="text-sm font-medium">待办事项</label>
                  <Input
                    value={editForm.workItem || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">事项提出场景</label>
                  <Input
                    value={editForm.proposedScene || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedScene: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">形成时间</label>
                  <Input
                    type="date"
                    value={editForm.formedTime || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, formedTime: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    主责部门
                    <span className="text-xs text-gray-400 ml-1">（可多选，支持搜索）</span>
                  </label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={departmentOptions}
                    value={(editForm.departmentIds || []).map(String)}
                    onChange={(nextValues) => {
                      const nextDepartmentIds = nextValues.map(Number);
                      const nextDepartmentUserNames = new Set(
                        nextDepartmentIds.flatMap((deptId: number) =>
                          (departmentUsers[deptId] || []).map((p) => p.name),
                        ),
                      );
                      setEditForm((prev: any) => ({
                        ...prev,
                        departmentIds: nextDepartmentIds,
                        responsiblePersons: (prev.responsiblePersons || []).filter((name: string) =>
                          nextDepartmentUserNames.has(name),
                        ),
                      }));
                    }}
                    placeholder="请选择主责部门"
                    searchPlaceholder="搜索部门名称"
                    emptyText="未找到匹配部门"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    主责责任人
                    <span className="text-xs text-gray-400 ml-1">（主责部门的具体责任人，可多选，支持搜索）</span>
                  </label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={responsiblePersonOptions}
                    value={editForm.responsiblePersons || []}
                    onChange={(nextPersons) =>
                      setEditForm((prev: any) => ({
                        ...prev,
                        responsiblePersons: nextPersons,
                        responsiblePerson: nextPersons.join('、'),
                      }))
                    }
                    placeholder={(editForm.departmentIds || []).length > 0 ? '请选择主责责任人' : '请先选择主责部门'}
                    searchPlaceholder="搜索姓名"
                    emptyText="未找到匹配责任人"
                    disabled={(editForm.departmentIds || []).length === 0}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    配合部门
                    <span className="text-xs text-gray-400 ml-1">（可多选，支持搜索）</span>
                  </label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={departmentOptions}
                    value={(editForm.cooperateDepartmentIds || []).map(String)}
                    onChange={(nextValues) => {
                      const nextDeptIds = nextValues.map(Number);
                      const nextDeptUserNames = new Set(
                        nextDeptIds.flatMap((deptId: number) =>
                          (departmentUsers[deptId] || []).map((p) => p.name),
                        ),
                      );
                      setEditForm((prev: any) => ({
                        ...prev,
                        cooperateDepartmentIds: nextDeptIds,
                        cooperatePersons: (prev.cooperatePersons || []).filter((name: string) =>
                          nextDeptUserNames.has(name),
                        ),
                      }));
                    }}
                    placeholder="请选择配合部门"
                    searchPlaceholder="搜索部门名称"
                    emptyText="未找到匹配部门"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    配合责任人
                    <span className="text-xs text-gray-400 ml-1">（配合部门的具体责任人，可多选，支持搜索）</span>
                  </label>
                  <MultiSearchSelect
                    className="mt-2"
                    options={cooperatePersonOptions}
                    value={editForm.cooperatePersons || []}
                    onChange={(nextPersons) =>
                      setEditForm((prev: any) => ({
                        ...prev,
                        cooperatePersons: nextPersons,
                        cooperatePerson: nextPersons.join('、'),
                      }))
                    }
                    placeholder={(editForm.cooperateDepartmentIds || []).length > 0 ? '请选择配合责任人' : '请先选择配合部门'}
                    searchPlaceholder="搜索姓名"
                    emptyText="未找到匹配责任人"
                    disabled={(editForm.cooperateDepartmentIds || []).length === 0}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">工作计划</label>
                  <Textarea
                    value={editForm.workPlan || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, workPlan: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">计划完成时间</label>
                  <Input
                    type="date"
                    value={editForm.planCompleteTime || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, planCompleteTime: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium">进展情况</label>
                  <Textarea
                    value={editForm.progress || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, progress: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-2">工作节点</label>
              <div className="space-y-3">
                {(editForm.nodes || []).map((node: any, index: number) => (
                  <div key={node.id} className="border rounded p-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Input
                        value={node.title}
                        onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                        placeholder={`节点${index + 1}`}
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={node.completeTime || ''}
                        onChange={(e) => updateNodeCompleteTime(node.id, e.target.value)}
                        className="w-40"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => addSubNode(node.id)}>
                        添加子节点
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => deleteNode(node.id)}>
                        删除
                      </Button>
                    </div>

                    <div className="pl-5 mt-2 space-y-2">
                      {(node.children || []).map((child: any, childIndex: number) => (
                        <div key={child.id} className="flex items-center gap-2">
                          <Input
                            value={child.title}
                            onChange={(e) => updateSubNodeTitle(node.id, child.id, e.target.value)}
                            placeholder={`子节点${childIndex + 1}`}
                            className="flex-1"
                          />
                          <Input
                            type="date"
                            value={child.completeTime || ''}
                            onChange={(e) => updateSubNodeCompleteTime(node.id, child.id, e.target.value)}
                            className="w-40"
                          />
                          <Button type="button" variant="destructive" size="sm" onClick={() => deleteSubNode(node.id, child.id)}>
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addNode}>
                  添加节点
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">修改说明 / 重新提交原因</label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
                placeholder="请说明修改内容或重新提交原因"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={onResubmit}>
                保存修改并重新提交
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                取消
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}