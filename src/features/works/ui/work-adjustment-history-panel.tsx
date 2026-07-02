'use client';

import type { Work } from '@/features/works/client/work-client.types';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';
import {
  ADJUSTMENT_FIELD_LABELS,
  adjustmentValueToDisplay,
  getChangedAdjustmentFields,
  getDisplayAdjustmentFields,
} from '@/features/works/ui/work-adjustment-display';

interface WorkAdjustmentHistoryPanelProps {
  work: Work;
  departments?: Array<{ id: number; name: string }>;
}

function formatDateTime(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WorkAdjustmentHistoryPanel({
  work,
  departments,
}: WorkAdjustmentHistoryPanelProps) {
  const history = work.adjustHistory || [];

  if (history.length === 0) {
    return null;
  }

  return (
    <div className={PANEL_PADDED}>
      <div className="font-semibold text-slate-800 mb-3 text-[13px]">调整历史</div>
      <div>
        {history.map((item: any, index) => {
          const beforeSnapshot = item.beforeSnapshot || {};
          const patch = item.patch || {};
          const changedFields = getChangedAdjustmentFields(beforeSnapshot, patch);
          const displayFields = getDisplayAdjustmentFields(changedFields);

          return (
            <div
              key={item.id ?? index}
              className="py-2.5 px-3 mb-0.5 last:mb-0"
              style={{ borderLeft: '3px solid #a855f7' }}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="text-[13px] font-semibold text-slate-900">
                  {item.approvedBy || '审批通过'}
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {formatDateTime(item.approvedAt || item.requestedAt)}
                </span>
              </div>
              <div className="text-xs font-semibold text-purple-600">
                调整事项内容
                {displayFields.length > 0 && (
                  <span className="font-normal text-slate-500">
                    {' '}
                    · {displayFields.map((field) => ADJUSTMENT_FIELD_LABELS[field] || field).join('、')}
                  </span>
                )}
                {displayFields.length === 0 && (item.fromTime || item.toTime) && (
                  <span className="font-normal text-slate-500">
                    {' '}
                    · {item.fromTime || '-'} → {item.toTime || '-'}
                  </span>
                )}
              </div>
              {item.reason && (
                <div className="mt-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-2 text-xs text-slate-600 whitespace-pre-wrap break-words">
                  {item.reason}
                </div>
              )}
              {displayFields.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white">
                  <div className="grid grid-cols-[6rem_1fr_1fr] bg-slate-50 text-[11px] font-medium text-slate-500">
                    <div className="border-r border-slate-200 px-2.5 py-1.5">字段</div>
                    <div className="border-r border-slate-200 px-2.5 py-1.5">调整前</div>
                    <div className="px-2.5 py-1.5">调整后</div>
                  </div>
                  {displayFields.map((field) => (
                    <div key={field} className="grid grid-cols-[6rem_1fr_1fr] border-t border-slate-200 text-xs">
                      <div className="border-r border-slate-200 px-2.5 py-1.5 font-medium text-slate-600">
                        {ADJUSTMENT_FIELD_LABELS[field] || field}
                      </div>
                      <div className="border-r border-slate-200 px-2.5 py-1.5 text-slate-600 whitespace-pre-wrap break-words">
                        {adjustmentValueToDisplay(field, beforeSnapshot[field], departments, beforeSnapshot)}
                      </div>
                      <div className="px-2.5 py-1.5 text-slate-900 whitespace-pre-wrap break-words">
                        {adjustmentValueToDisplay(field, patch[field], departments, patch)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
