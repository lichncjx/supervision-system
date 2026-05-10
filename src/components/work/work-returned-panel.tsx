'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

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
  // No longer used for dropdown selects (replaced by text inputs for responsibleLeader/responsiblePerson)
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
  departmentLeaders: _departmentLeaders,
  departmentManagers: _departmentManagers,
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
  const cooperators = Array.isArray(editForm.cooperators) ? editForm.cooperators : [];
  const businessDepts = departments.filter((d) => d.isBusiness !== false);

  function addCooperator() {
    setEditForm((prev: any) => ({
      ...prev,
      cooperators: [...(Array.isArray(prev.cooperators) ? prev.cooperators : []), { departmentId: 0, departmentName: '', leader: '', person: '' }],
    }));
  }

  function removeCooperator(idx: number) {
    setEditForm((prev: any) => ({
      ...prev,
      cooperators: (Array.isArray(prev.cooperators) ? prev.cooperators : []).filter((_: any, i: number) => i !== idx),
    }));
  }

  function updateCooperator(idx: number, field: string, value: any) {
    setEditForm((prev: any) => {
      const list = Array.isArray(prev.cooperators) ? [...prev.cooperators] : [];
      if (field === 'departmentId') {
        const newId = Number(value);
        if (list.some((c: any, i: number) => i !== idx && c.departmentId === newId)) {
          alert('该配合部门已存在，请勿重复添加');
          return prev;
        }
        const dept = businessDepts.find((d) => d.id === newId);
        list[idx] = { ...list[idx], departmentId: newId, departmentName: dept?.name || '' };
      } else {
        list[idx] = { ...list[idx], [field]: value };
      }
      return { ...prev, cooperators: list };
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">退回事项处理</h3>
      <div className="space-y-4">
        {rejectReason && (
          <div className="p-3 bg-rose-50/50 rounded text-red-700 break-words whitespace-pre-wrap">
            退回原因：{rejectReason}
          </div>
        )}

        {!editMode ? (
          <div className="flex gap-3">
            <Button onClick={() => setEditMode(true)} className="rounded-full">
              修改后重新提交
            </Button>
            <Button variant="destructive" onClick={onDelete} className="rounded-full">
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

                <div>
                  <label className="text-sm font-medium">责任领导</label>
                  <Input
                    value={editForm.responsibleLeader || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: e.target.value }))}
                    placeholder="请输入责任领导姓名"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">责任人</label>
                  <Input
                    value={editForm.responsiblePerson || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: e.target.value }))}
                    placeholder="请输入责任人姓名"
                  />
                </div>
              </div>
            )}

            {isTodo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    事项提出领导
                    <span className="text-xs text-slate-400 ml-1">（提出该待办事项的公司领导，默认也是审批领导）</span>
                  </label>
                  <select
                    value={editForm.proposedLeaderId || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedLeaderId: e.target.value }))}
                    className="rounded-lg border-slate-200 bg-white/60"
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

                <div>
                  <label className="text-sm font-medium">主责部门</label>
                  <select
                    value={editForm.departmentId || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, departmentId: Number(e.target.value) }))}
                    className="rounded-lg border-slate-200 bg-white/60 w-full mt-2"
                  >
                    <option value="">请选择主责部门</option>
                    {businessDepts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">责任领导</label>
                  <Input
                    value={editForm.responsibleLeader || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: e.target.value }))}
                    placeholder="请输入责任领导姓名"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">责任人</label>
                  <Input
                    value={editForm.responsiblePerson || ''}
                    onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: e.target.value }))}
                    placeholder="请输入责任人姓名"
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

                {/* 配合方 */}
                <div className="md:col-span-2 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">配合方</label>
                    <Button type="button" variant="outline" size="sm" onClick={addCooperator}>添加配合方</Button>
                  </div>
                  {cooperators.length === 0 && (
                    <p className="text-xs text-slate-400">暂无配合方</p>
                  )}
                  {cooperators.map((c: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <select
                        value={c.departmentId || ''}
                        onChange={(e) => updateCooperator(idx, 'departmentId', e.target.value)}
                        className="flex-1 rounded-lg border-slate-200 bg-white/60 text-sm"
                      >
                        <option value="">选择配合部门</option>
                        {businessDepts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <Input
                        value={c.leader || ''}
                        onChange={(e) => updateCooperator(idx, 'leader', e.target.value)}
                        placeholder="配合责任领导（可选）"
                        className="flex-1"
                      />
                      <Input
                        value={c.person || ''}
                        onChange={(e) => updateCooperator(idx, 'person', e.target.value)}
                        placeholder="配合责任人（可选）"
                        className="flex-1"
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeCooperator(idx)}>删除</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-2">工作节点</label>
              <div className="space-y-3">
                {(editForm.nodes || []).map((node: any, index: number) => (
                  <div key={node.id} className="border rounded p-3 bg-slate-50/50">
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
                      <Button type="button" variant="outline" size="sm" onClick={() => addSubNode(node.id)} className="rounded-full">
                        添加子节点
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => deleteNode(node.id)} className="rounded-full">
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
                          <Button type="button" variant="destructive" size="sm" onClick={() => deleteSubNode(node.id, child.id)} className="rounded-full">
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" onClick={addNode} className="rounded-full">
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
              <Button onClick={onResubmit} className="rounded-full">
                保存修改并重新提交
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)} className="rounded-full">
                取消
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}