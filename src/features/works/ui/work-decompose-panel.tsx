'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import { WorkFormCooperators } from '@/features/works/ui/work-form-cooperators';
import { ResponsibleFields } from '@/features/works/ui/work-form-fields';
import type { WorkNode } from '@/features/works/client/work-client.types';
import { FIELD_LABEL, PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkDecomposePanelProps {
  editForm: any;
  setEditForm: (form: any) => void;
  onSubmitDecomposition: () => void;
  rejectReason?: string;
  isReturned?: boolean;
  departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
}

export function WorkDecomposePanel({
  editForm,
  setEditForm,
  onSubmitDecomposition,
  rejectReason,
  isReturned,
  departments,
}: WorkDecomposePanelProps) {
  const nodes: WorkNode[] = Array.isArray(editForm.nodes) ? editForm.nodes : [];

  return (
    <div className={PANEL_PADDED}>
      <h3 className="font-semibold text-slate-800 mb-4">
        {isReturned ? '待办事项分解（驳回修改）' : '待办事项分解'}
      </h3>
      <div className="space-y-4">
        {isReturned && rejectReason && (
          <div className="p-3 bg-rose-50 border border-red-200 rounded text-red-700 text-sm break-words whitespace-pre-wrap">
            <span className="font-medium">驳回原因：</span>
            {rejectReason}
          </div>
        )}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          该事项由公司领导提出，请责任部门进行任务分解，补充工作计划、节点、子节点和计划完成时间后提交审批。
        </div>

        <div className="flex gap-4 [&>div]:flex-1">
          <ResponsibleFields
            leaderValue={editForm.responsibleLeader || ''}
            onLeaderChange={(v) => setEditForm((prev: any) => ({ ...prev, responsibleLeader: v }))}
            personValue={editForm.responsiblePerson || ''}
            onPersonChange={(v) => setEditForm((prev: any) => ({ ...prev, responsiblePerson: v }))}
            departmentId={editForm.departmentId || undefined}
            leaderUserId={editForm.responsibleLeaderUserId}
            onLeaderUserIdChange={(id) => setEditForm((prev: any) => ({ ...prev, responsibleLeaderUserId: id }))}
            personUserId={editForm.responsiblePersonUserId}
            onPersonUserIdChange={(id) => setEditForm((prev: any) => ({ ...prev, responsiblePersonUserId: id }))}
          />
        </div>

        <div>
          <label className={FIELD_LABEL + ' mb-1 block'}>工作计划</label>
          <Textarea
            value={editForm.workPlan || ''}
            onChange={(e) => setEditForm((prev: any) => ({ ...prev, workPlan: e.target.value }))}
            rows={3}
          />
        </div>

        <div>
          <label className={FIELD_LABEL + ' mb-1 block'}>完成时间</label>
          <Input
            type="date"
            value={editForm.planCompleteTime || ''}
            onChange={(e) => setEditForm((prev: any) => ({ ...prev, planCompleteTime: e.target.value }))}
          />
        </div>

        <WorkFormCooperators
          cooperators={Array.isArray(editForm.cooperators) ? editForm.cooperators : []}
          onChange={(cooperators) => setEditForm((prev: any) => ({ ...prev, cooperators }))}
          departments={departments.filter((d) => d.isBusiness && d.id !== editForm.departmentId)}
        />

        <WorkFormNodes
          nodes={nodes}
          onChange={(value) => setEditForm((prev: any) => ({ ...prev, nodes: value }))}
          nodeLabel="任务分解节点（可选）"
          nodePlaceholderPrefix="任务分解节点"
        />

        <Button onClick={onSubmitDecomposition} className="rounded-full">
          提交分解结果
        </Button>
      </div>
    </div>
  );
}
