'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import {
  WorkItemField,
  DepartmentField,
  ResponsibleFields,
  PlanCompleteTimeField,
  IsInnovationField,
  TodoSpecificFields,
} from '@/features/works/ui/work-form-fields';
import type { WorkNode, Cooperator } from '@/features/works/client/work-client.types';
import { FIELD_LABEL } from './visual-tokens';

interface WorkActionDialogsProps {
  isAdjustDialogOpen: boolean;
  setIsAdjustDialogOpen: (value: boolean) => void;
  isCancelDialogOpen: boolean;
  setIsCancelDialogOpen: (value: boolean) => void;
  adjustReason: string;
  setAdjustReason: (reason: string) => void;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  approvalLeaderName?: string | null;
  proposedLeaderName?: string | null;
  editForm: any;
  setEditForm: (form: any) => void;
  departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
  cooperatorDepts?: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
  isPriorityOrMain: boolean;
  isTodo: boolean;
  onSubmitAdjust: () => void;
  onSubmitCancel: () => void;
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
  approvalLeaderName,
  proposedLeaderName,
  editForm,
  setEditForm,
  departments,
  cooperatorDepts,
  isPriorityOrMain,
  isTodo,
  onSubmitAdjust,
  onSubmitCancel,
}: WorkActionDialogsProps) {
  const nodes: WorkNode[] = Array.isArray(editForm.nodes) ? editForm.nodes : [];
  const cooperators: Cooperator[] = Array.isArray(editForm.cooperators) ? editForm.cooperators : [];
  const businessDepts = departments.filter((d) => (d as any).isBusiness !== false);
  const availableCooperatorDepts = cooperatorDepts ?? businessDepts;
  const readonlyApprovalLeader = approvalLeaderName || proposedLeaderName || '-';

  return (
    <>
      {/* 申请调整Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="rounded-xl border-slate-200/80 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>申请调整</DialogTitle>
            <DialogDescription>
              如需变更工作计划、完成时间、责任人等，请填写调整原因并提交审批。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={FIELD_LABEL + ' mb-1 block'}>
                公司审批领导
                <span className="text-xs text-slate-400 ml-1">（负责本次调整审批的公司领导）</span>
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {readonlyApprovalLeader}
              </div>
            </div>

            <div>
              <label className={FIELD_LABEL + ' mb-1 block'}>调整原因</label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                rows={3}
                placeholder="请填写调整原因"
              />
            </div>

            {/* 拟调整内容 */}
            <div className="border-t pt-4">
              <h5 className={FIELD_LABEL + ' mb-3 block'}>拟调整内容</h5>

              {/* 重点工作/主要工作调整表单 */}
              {isPriorityOrMain && (
                <div className="space-y-4">
                  <WorkItemField
                    label="工作事项"
                    value={editForm.workItem || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, workItem: v }))}
                    placeholder="请输入工作事项"
                  />
                  <WorkItemField
                    label="业务类别"
                    value={editForm.businessCategory || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, businessCategory: v }))}
                    placeholder="请输入业务类别"
                  />
                  <PlanCompleteTimeField
                    label="完成时间"
                    value={editForm.planCompleteTime || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, planCompleteTime: v }))}
                  />
                  <WorkItemField
                    label="完成形式"
                    value={editForm.completeForm || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, completeForm: v }))}
                    placeholder="请输入完成形式"
                  />
                  <DepartmentField
                    label="责任部门"
                    value={editForm.departmentId ? String(editForm.departmentId) : ''}
                    onChange={(v) => setEditForm((prev: any) => ({
                      ...prev,
                      departmentId: Number(v),
                      responsibleLeader: '',
                      responsiblePerson: '',
                      responsibleLeaderMemberId: undefined,
                      responsiblePersonMemberId: undefined,
                    }))}
                    departments={departments}
                  />
                  <ResponsibleFields
                    leaderValue={editForm.responsibleLeader || ''}
                    onLeaderChange={(v) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: v }))}
                    personValue={editForm.responsiblePerson || ''}
                    onPersonChange={(v) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: v }))}
                    departmentId={editForm.departmentId || undefined}
                    leaderMemberId={editForm.responsibleLeaderMemberId}
                    onLeaderMemberIdChange={(id) => setEditForm((prev: any) => ({ ...prev, responsibleLeaderMemberId: id }))}
                    personMemberId={editForm.responsiblePersonMemberId}
                    onPersonMemberIdChange={(id) => setEditForm((prev: any) => ({ ...prev, responsiblePersonMemberId: id }))}
                  />
                  <IsInnovationField
                    isInnovation={!!editForm.isInnovation}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, isInnovation: v }))}
                  />

                  <WorkFormNodes
                    nodes={nodes}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, nodes: value }))}
                    nodeLabel="工作节点（可选）"
                    nodePlaceholderPrefix="工作节点"
                  />
                </div>
              )}

              {/* 待办事项调整表单 */}
              {isTodo && (
                <div className="space-y-4">
                  <WorkItemField
                    label="待办事项"
                    value={editForm.workItem || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, workItem: v }))}
                    placeholder="请输入待办事项"
                  />
                  <div>
                    <label className={FIELD_LABEL + ' mb-1 block'}>事项提出领导</label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {proposedLeaderName || '-'}
                    </div>
                  </div>
                  <TodoSpecificFields
                    proposedScene={editForm.proposedScene || ''}
                    onProposedSceneChange={(v) => setEditForm((prev: any) => ({ ...prev, proposedScene: v }))}
                    formedTime={editForm.formedTime || ''}
                    onFormedTimeChange={(v) => setEditForm((prev: any) => ({ ...prev, formedTime: v }))}
                    workPlan={editForm.workPlan || ''}
                    onWorkPlanChange={(v) => setEditForm((prev: any) => ({ ...prev, workPlan: v }))}
                    progress={editForm.progress || ''}
                    onProgressChange={(v) => setEditForm((prev: any) => ({ ...prev, progress: v }))}
                  />
                  <PlanCompleteTimeField
                    label="完成时间"
                    value={editForm.planCompleteTime || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, planCompleteTime: v }))}
                  />
                  <DepartmentField
                    label="主责部门"
                    value={editForm.departmentId ? String(editForm.departmentId) : ''}
                    onChange={(v) => setEditForm((prev: any) => ({
                      ...prev,
                      departmentId: Number(v),
                      responsibleLeader: '',
                      responsiblePerson: '',
                      responsibleLeaderMemberId: undefined,
                      responsiblePersonMemberId: undefined,
                    }))}
                    departments={businessDepts}
                    placeholder="请选择主责部门"
                  />
                  <ResponsibleFields
                    leaderValue={editForm.responsibleLeader || ''}
                    onLeaderChange={(v) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: v }))}
                    personValue={editForm.responsiblePerson || ''}
                    onPersonChange={(v) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: v }))}
                    departmentId={editForm.departmentId || undefined}
                    leaderMemberId={editForm.responsibleLeaderMemberId}
                    onLeaderMemberIdChange={(id) => setEditForm((prev: any) => ({ ...prev, responsibleLeaderMemberId: id }))}
                    personMemberId={editForm.responsiblePersonMemberId}
                    onPersonMemberIdChange={(id) => setEditForm((prev: any) => ({ ...prev, responsiblePersonMemberId: id }))}
                  />
                  <WorkFormCooperators
                    cooperators={cooperators}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, cooperators: value }))}
                    departments={availableCooperatorDepts.filter((d) => d.id !== editForm.departmentId)}
                  />
                  <WorkFormNodes
                    nodes={nodes}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, nodes: value }))}
                    nodeLabel="任务节点（可选）"
                    nodePlaceholderPrefix="任务节点"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setIsAdjustDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              className="rounded-full"
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
        <DialogContent className="rounded-xl border-slate-200/80 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>申请取消</DialogTitle>
            <DialogDescription>
              取消申请审批通过后，事项将进入已取消状态，请谨慎操作。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={FIELD_LABEL + ' mb-1 block'}>
                公司审批领导
                <span className="text-xs text-slate-400 ml-1">（负责本次取消审批的公司领导）</span>
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {readonlyApprovalLeader}
              </div>
            </div>

            <div>
              <label className={FIELD_LABEL + ' mb-1 block'}>取消原因</label>
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
              className="rounded-full"
              onClick={() => {
                setIsCancelDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              className="rounded-full"
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
