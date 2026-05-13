'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WorkFormSectionCard } from '@/features/works/ui/work-form-section-card';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import {
  WorkItemField,
  ProposedLeaderField,
  DepartmentField,
  ResponsibleFields,
  PlanCompleteTimeField,
  TodoSpecificFields,
} from '@/features/works/ui/work-form-fields';
import type { Cooperator, WorkNode } from '@/features/works/domain/work-client.types';

interface WorkDraftEditPanelProps {
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
  departmentLeaders?: Array<{ id: number; name: string; role: string; departmentId: number }>;
  departmentManagers?: Array<{ id: number; name: string; role: string; departmentId: number }>;
  onResubmit: () => void;
  onDelete: () => void;
  isRegularDraft?: boolean;
  onSaveDraft?: () => void;
}

export function WorkDraftEditPanel({
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
  isRegularDraft,
  onSaveDraft,
}: WorkDraftEditPanelProps) {
  const cooperators: Cooperator[] = Array.isArray(editForm.cooperators) ? editForm.cooperators : [];
  const nodes: WorkNode[] = Array.isArray(editForm.nodes) ? editForm.nodes : [];
  const businessDepts = departments.filter((d) => d.isBusiness !== false);

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">
        {isRegularDraft ? '完善草稿' : '退回事项处理'}
      </h3>
      <div className="space-y-4">
        {isRegularDraft && (
          <p className="text-sm text-slate-500">可继续完善事项信息、上传附件后提交审批</p>
        )}
        {!isRegularDraft && rejectReason && (
          <div className="p-3 bg-rose-50/50 rounded text-red-700 break-words whitespace-pre-wrap">
            退回原因：{rejectReason}
          </div>
        )}

        {!editMode ? (
          <div className="flex gap-3">
            <Button onClick={() => setEditMode(true)} className="rounded-full">
              {isRegularDraft ? '编辑草稿' : '修改后重新提交'}
            </Button>
            <Button variant="destructive" onClick={onDelete} className="rounded-full">
              {isRegularDraft ? '删除草稿' : '删除退回事项'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {isPriorityOrMain && (
              <>
                <WorkFormSectionCard title="基本信息">
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
                    label="计划完成时间"
                    value={editForm.completeTime || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, completeTime: v }))}
                  />
                  <WorkItemField
                    label="完成形式"
                    value={editForm.completeForm || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, completeForm: v }))}
                    placeholder="请输入完成形式"
                  />
                </WorkFormSectionCard>
                <WorkFormSectionCard title="责任分工">
                  <ResponsibleFields
                    leaderValue={editForm.responsibleLeader || ''}
                    onLeaderChange={(v) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: v }))}
                    personValue={editForm.responsiblePerson || ''}
                    onPersonChange={(v) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: v }))}
                  />
                </WorkFormSectionCard>
              </>
            )}

            {isTodo && (
              <>
                <WorkFormSectionCard title="基本信息">
                  <ProposedLeaderField
                    value={editForm.proposedLeaderId || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, proposedLeaderId: v }))}
                    leaders={companyLeaders}
                    disabled={false}
                  />
                  <WorkItemField
                    label="待办事项"
                    value={editForm.workItem || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, workItem: v }))}
                    placeholder="请输入待办事项"
                  />
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
                    label="计划完成时间"
                    value={editForm.planCompleteTime || ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, planCompleteTime: v }))}
                  />
                </WorkFormSectionCard>
                <WorkFormSectionCard title="责任分工">
                  <DepartmentField
                    label="主责部门"
                    value={editForm.departmentId ? String(editForm.departmentId) : ''}
                    onChange={(v) => setEditForm((prev: any) => ({ ...prev, departmentId: Number(v) }))}
                    departments={businessDepts}
                    placeholder="请选择主责部门"
                  />
                  <ResponsibleFields
                    leaderValue={editForm.responsibleLeader || ''}
                    onLeaderChange={(v) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: v }))}
                    personValue={editForm.responsiblePerson || ''}
                    onPersonChange={(v) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: v }))}
                  />
                  <WorkFormCooperators
                    cooperators={cooperators}
                    onChange={(value) => setEditForm((prev: any) => ({ ...prev, cooperators: value }))}
                    departments={businessDepts}
                  />
                </WorkFormSectionCard>
              </>
            )}

            <WorkFormNodes
              nodes={nodes}
              onChange={(value) => setEditForm((prev: any) => ({ ...prev, nodes: value }))}
              nodeLabel={isTodo ? '任务节点（可选）' : '工作节点（可选）'}
              addButtonLabel={isTodo ? '新增任务节点' : '新增工作节点'}
              nodePlaceholderPrefix={isTodo ? '任务节点' : '工作节点'}
            />

            <div>
              <label className="text-sm font-medium">
                {isRegularDraft ? '修改说明' : '修改说明 / 重新提交原因'}
              </label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
                placeholder={isRegularDraft ? '请说明修改内容' : '请说明修改内容或重新提交原因'}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={isRegularDraft && onSaveDraft ? onSaveDraft : onResubmit} className="rounded-full">
                {isRegularDraft ? '保存草稿修改' : '保存修改并重新提交'}
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
