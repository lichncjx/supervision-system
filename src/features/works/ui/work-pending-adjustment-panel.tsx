'use client';

import type { Work } from '@/features/works/client/work-client.types';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';
import {
  ADJUSTMENT_FIELD_LABELS,
  adjustmentValueToDisplay,
  getChangedAdjustmentFields,
} from '@/features/works/ui/work-adjustment-display';

interface WorkPendingAdjustmentPanelProps {
  work: Work;
  departments?: Array<{ id: number; name: string }>;
}

export function WorkPendingAdjustmentPanel({
  work,
  departments,
}: WorkPendingAdjustmentPanelProps) {
  if (!work.pendingAdjustment) {
    return null;
  }

  const beforeSnapshot = work.pendingAdjustmentBeforeSnapshot || {};
  const changedFields = getChangedAdjustmentFields(
    beforeSnapshot as Record<string, unknown>,
    work.pendingAdjustment as Record<string, unknown>,
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
                {ADJUSTMENT_FIELD_LABELS[field] || field}
              </div>
              <div className="border-r border-slate-200 px-3 py-2 whitespace-pre-wrap break-words text-slate-600">
                {adjustmentValueToDisplay(field, (beforeSnapshot as any)[field], departments)}
              </div>
              <div className="px-3 py-2 whitespace-pre-wrap break-words text-slate-900">
                {adjustmentValueToDisplay(field, (work.pendingAdjustment as any)[field], departments)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
