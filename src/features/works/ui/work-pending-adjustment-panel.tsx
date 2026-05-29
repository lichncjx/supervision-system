'use client';

import type { Work } from '@/features/works/client/work-client.types';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkPendingAdjustmentPanelProps {
  work: Work;
  departments?: Array<{ id: number; name: string }>;
}

const FIELD_LABELS: Record<string, string> = {
  title: '标题',
  workItem: '事项内容',
  businessCategory: '业务类别',
  completeForm: '完成形式',
  isInnovation: '是否创新工作',
  departmentId: '责任部门',
  responsibleLeader: '责任领导',
  responsiblePerson: '责任人',
  responsibleLeaderMemberId: '责任领导人员',
  responsiblePersonMemberId: '责任人人员',
  cooperators: '配合方',
  workPlan: '工作计划',
  planCompleteTime: '计划完成时间',
  progress: '进展情况',
  nodes: '工作节点',
  proposedScene: '事项提出场景',
  formedTime: '形成时间',
};

function normalizeValue(value: unknown) {
  if (value === undefined) return null;
  return value;
}

function valueToText(
  field: string,
  value: unknown,
  departments?: Array<{ id: number; name: string }>,
) {
  const normalized = normalizeValue(value);
  if (field === 'departmentId') {
    const department = departments?.find((d) => d.id === Number(normalized));
    return department?.name || (normalized == null ? '-' : String(normalized));
  }
  if (typeof normalized === 'boolean') return normalized ? '是' : '否';
  if (normalized == null || normalized === '') return '-';
  if (Array.isArray(normalized)) {
    if (normalized.length === 0) return '-';
    return JSON.stringify(normalized, null, 2);
  }
  if (typeof normalized === 'object') return JSON.stringify(normalized, null, 2);
  return String(normalized);
}

function hasChanged(before: unknown, after: unknown) {
  return JSON.stringify(normalizeValue(before)) !== JSON.stringify(normalizeValue(after));
}

export function WorkPendingAdjustmentPanel({
  work,
  departments,
}: WorkPendingAdjustmentPanelProps) {
  if (!work.pendingAdjustment) {
    return null;
  }

  const beforeSnapshot = work.pendingAdjustmentBeforeSnapshot || {};
  const changedFields = Object.keys(work.pendingAdjustment).filter((field) =>
    hasChanged((beforeSnapshot as any)[field], (work.pendingAdjustment as any)[field]),
  );

  return (
    <div className={PANEL_PADDED}>
      <h3 className="font-semibold text-slate-800 mb-4">待审批调整内容</h3>
      <div className="space-y-2 text-sm">
        <div className="text-purple-600 break-words whitespace-pre-wrap">
          调整原因：{work.pendingAdjustmentReason || '-'}
        </div>
        <div>
          公司审批领导：{work.approvalLeader || '-'}
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[7rem_1fr_1fr] bg-slate-50 text-xs font-medium text-slate-500">
            <div className="border-r border-slate-200 px-3 py-2">字段</div>
            <div className="border-r border-slate-200 px-3 py-2">调整前</div>
            <div className="px-3 py-2">调整后</div>
          </div>
          {(changedFields.length > 0 ? changedFields : Object.keys(work.pendingAdjustment)).map((field) => (
            <div key={field} className="grid grid-cols-[7rem_1fr_1fr] border-t border-slate-200 text-sm">
              <div className="border-r border-slate-200 px-3 py-2 font-medium text-slate-600">
                {FIELD_LABELS[field] || field}
              </div>
              <div className="border-r border-slate-200 px-3 py-2 whitespace-pre-wrap break-words text-slate-600">
                {valueToText(field, (beforeSnapshot as any)[field], departments)}
              </div>
              <div className="px-3 py-2 whitespace-pre-wrap break-words text-slate-900">
                {valueToText(field, (work.pendingAdjustment as any)[field], departments)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
