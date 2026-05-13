'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { WorkFormNodes } from '@/features/works/ui/work-form-nodes';
import type { WorkNode } from '@/features/works/domain/work-client.types';

interface WorkDecomposePanelProps {
  visible: boolean;
  editForm: any;
  setEditForm: (form: any) => void;
  onSubmitDecomposition: () => void;
  rejectReason?: string;
  isReturned?: boolean;
}

export function WorkDecomposePanel({
  visible,
  editForm,
  setEditForm,
  onSubmitDecomposition,
  rejectReason,
  isReturned,
}: WorkDecomposePanelProps) {
  const nodes: WorkNode[] = Array.isArray(editForm.nodes) ? editForm.nodes : [];

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
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

        <div>
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

        <WorkFormNodes
          nodes={nodes}
          onChange={(value) => setEditForm((prev: any) => ({ ...prev, nodes: value }))}
          nodeLabel="任务节点（可选）"
          addButtonLabel="新增任务节点"
          nodePlaceholderPrefix="任务节点"
        />

        <Button onClick={onSubmitDecomposition}>
          提交分解结果
        </Button>
      </div>
    </div>
  );
}