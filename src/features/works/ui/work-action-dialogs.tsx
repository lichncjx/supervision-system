'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface WorkActionDialogsProps {
  isAdjustDialogOpen: boolean;
  setIsAdjustDialogOpen: (value: boolean) => void;
  isCancelDialogOpen: boolean;
  setIsCancelDialogOpen: (value: boolean) => void;
  adjustReason: string;
  setAdjustReason: (reason: string) => void;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  approvalLeaderId: string;
  setApprovalLeaderId: (value: string) => void;
  editForm: any;
  setEditForm: (form: any) => void;
  companyLeaders: Array<{ id: number; name: string; role: string }>;
  departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
  isPriorityOrMain: boolean;
  isTodo: boolean;
  onSubmitAdjust: () => void;
  onSubmitCancel: () => void;
  updateNodeTitle: (nodeId: number, title: string) => void;
  updateNodeCompleteTime: (nodeId: number, completeTime: string) => void;
  deleteNode: (nodeId: number) => void;
  addNode: () => void;
  addSubNode: (nodeId: number) => void;
  updateSubNodeTitle: (nodeId: number, subNodeId: number, title: string) => void;
  updateSubNodeCompleteTime: (nodeId: number, subNodeId: number, completeTime: string) => void;
  deleteSubNode: (nodeId: number, subNodeId: number) => void;
}

export function WorkActionDialogs({
  isAdjustDialogOpen,
  setIsAdjustDialogOpen,
  isCancelDialogOpen,
  setIsCancelDialogOpen,
  adjustReason,
  setAdjustReason,
  cancelReason,
  setCancelReason,
  approvalLeaderId,
  setApprovalLeaderId,
  editForm,
  setEditForm,
  companyLeaders,
  departments,
  isPriorityOrMain,
  isTodo,
  onSubmitAdjust,
  onSubmitCancel,
  updateNodeTitle,
  updateNodeCompleteTime,
  deleteNode,
  addNode,
  addSubNode,
  updateSubNodeTitle,
  updateSubNodeCompleteTime,
  deleteSubNode,
}: WorkActionDialogsProps) {
  const cooperators = Array.isArray(editForm.cooperators) ? editForm.cooperators : [];
  const businessDepts = departments.filter((d) => (d as any).isBusiness !== false);

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

  return (
    <>
      {/* 申请调整Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请调整</DialogTitle>
            <DialogDescription>
              如需变更工作计划、完成时间、责任人等，请填写调整原因并提交审批。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                公司审批领导
                <span className="text-xs text-slate-400 ml-1">（负责本次调整审批的公司领导）</span>
              </label>
              <select
                value={approvalLeaderId}
                onChange={(e) => setApprovalLeaderId(e.target.value)}
                className="rounded-lg border-slate-200 bg-white/60"
              >
                <option value="">请选择公司审批领导</option>
                {companyLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">调整原因</label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={3}
                placeholder="请填写调整原因"
              />
            </div>

            {/* 拟调整内容 */}
            <div className="border-t pt-4">
              <h5 className="text-sm font-medium mb-3">拟调整内容</h5>
              
              {/* 重点工作/主要工作调整表单 */}
              {isPriorityOrMain && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">工作事项</label>
                      <Input
                        value={editForm.workItem || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                        placeholder="请输入工作事项"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">业务类别</label>
                      <Input
                        value={editForm.businessCategory || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, businessCategory: e.target.value }))}
                        placeholder="请输入业务类别"
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
                        placeholder="请输入完成形式"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">责任部门</label>
                      <select
                        value={editForm.departmentId || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, departmentId: Number(e.target.value) }))}
                        className="rounded-lg border-slate-200 bg-white/60"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">责任领导</label>
                      <Input
                        value={editForm.responsibleLeader || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: e.target.value }))}
                        placeholder="请输入责任领导"
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
                    <div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={editForm.isInnovation || false}
                          onChange={(e) => setEditForm((prev: any) => ({ ...prev, isInnovation: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        <span>是否为创新工作</span>
                      </label>
                    </div>
                  </div>

                  {/* 工作节点编辑 */}
                  <div>
                    <label className="text-sm font-medium block mb-2">工作节点</label>
                    <div className="space-y-3">
                      {editForm.nodes && editForm.nodes.length > 0 && editForm.nodes.map((node: any, _index: number) => (
                        <div key={node.id} className="border rounded p-3 bg-slate-50/50">
                          <div className="flex items-center gap-2">
                            <Input
                              value={node.title}
                              onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                              placeholder="节点名称"
                              className="flex-1"
                            />
                            <Input
                              type="date"
                              value={node.completeTime || ''}
                              onChange={(e) => updateNodeCompleteTime(node.id, e.target.value)}
                              className="w-40"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSubNode(node.id)}
                            >
                              添加子节点
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteNode(node.id)}
                            >
                              删除
                            </Button>
                          </div>
                          {node.children && node.children.length > 0 && (
                            <div className="pl-5 mt-2 space-y-2">
                              {node.children.map((child: any, _childIndex: number) => (
                                <div key={child.id} className="flex items-center gap-2">
                                  <Input
                                    value={child.title}
                                    onChange={(e) => updateSubNodeTitle(node.id, child.id, e.target.value)}
                                    placeholder="子节点名称"
                                    className="flex-1"
                                  />
                                  <Input
                                    type="date"
                                    value={child.completeTime || ''}
                                    onChange={(e) => updateSubNodeCompleteTime(node.id, child.id, e.target.value)}
                                    className="w-40"
                                  />
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteSubNode(node.id, child.id)}
                                  >
                                    删除
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" onClick={addNode}>
                        添加工作节点
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 待办事项调整表单 */}
              {isTodo && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">待办事项</label>
                      <Input
                        value={editForm.workItem || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, workItem: e.target.value }))}
                        placeholder="请输入待办事项"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">事项提出领导</label>
                      <select
                        value={editForm.proposedLeaderId || ''}
                        onChange={(e) => {
                          const selected = companyLeaders.find((leader) => leader.id === Number(e.target.value));
                          setEditForm((prev: any) => ({
                            ...prev,
                            proposedLeaderId: e.target.value,
                            proposedLeader: selected?.name || '',
                            proposedLeaderRole: selected?.role || '',
                          }));
                        }}
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
                      <label className="text-sm font-medium">事项提出场景</label>
                      <Input
                        value={editForm.proposedScene || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, proposedScene: e.target.value }))}
                        placeholder="请输入事项提出场景"
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
                        className="rounded-lg border-slate-200 bg-white/60"
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
                    <div>
                      <label className="text-sm font-medium">工作计划</label>
                      <Input
                        value={editForm.workPlan || ''}
                        onChange={(e) => setEditForm((prev: any) => ({ ...prev, workPlan: e.target.value }))}
                        placeholder="请输入工作计划"
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
                        placeholder="请输入进展情况"
                      />
                    </div>
                  </div>

                  {/* 配合方 */}
                  <div className="border-t pt-4">
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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdjustDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                await onSubmitAdjust();
                setIsAdjustDialogOpen(false);
              }}
            >
              提交调整申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 申请取消Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请取消</DialogTitle>
            <DialogDescription>
              取消申请审批通过后，事项将进入已取消状态，请谨慎操作。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                公司审批领导
                <span className="text-xs text-slate-400 ml-1">（负责本次取消审批的公司领导）</span>
              </label>
              <select
                value={approvalLeaderId}
                onChange={(e) => setApprovalLeaderId(e.target.value)}
                className="rounded-lg border-slate-200 bg-white/60"
              >
                <option value="">请选择公司审批领导</option>
                {companyLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">取消原因</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="请填写取消原因"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await onSubmitCancel();
                setIsCancelDialogOpen(false);
              }}
            >
              提交取消申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}