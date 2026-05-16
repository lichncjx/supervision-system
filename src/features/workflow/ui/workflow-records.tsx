'use client';

import { CheckCircle2, RotateCcw, Send, FileEdit, XCircle, Clock } from 'lucide-react';
import { getRoleName } from '@/features/users/domain/role.rules';
import { getActionName } from '@/features/works/client/work-display.utils';
import { getWorkStatusLabel } from '@/features/works/domain/work-status.rules';
import { getWorkflowRecordDescription } from '@/features/workflow/client/workflow-display.utils';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkflowRecord {
  id: number;
  action: string;
  previousStatus: string;
  newStatus: string;
  initiatorName: string;
  initiatorRole: string;
  comment?: string;
  createdAt: string;
}

interface WorkflowRecordsProps {
  records: WorkflowRecord[];
}

function getActionIcon(action: string) {
  switch (action) {
    case 'submit':
      return <Send className="h-3.5 w-3.5 text-slate-400" />;
    case 'approve':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case 'reject':
      return <RotateCcw className="h-3.5 w-3.5 text-rose-500" />;
    case 'complete':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    case 'adjust':
    case 'cancel':
      return <XCircle className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-slate-300" />;
  }
}

export function WorkflowRecords({ records }: WorkflowRecordsProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <div className={PANEL_PADDED}>
      <h3 className="font-semibold text-slate-800 mb-4">审批记录</h3>
      <div className="space-y-0">
        {records.map((record) => {
          const recordDesc = getWorkflowRecordDescription(
            record.action,
            record.previousStatus,
            record.newStatus
          );
          const isSameStatus = record.previousStatus.toLowerCase() === record.newStatus.toLowerCase();
          const statusLabel = isSameStatus
            ? ''
            : `${getWorkStatusLabel(record.previousStatus as any)} → ${getWorkStatusLabel(record.newStatus as any)}`;

          return (
            <div key={record.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-b-0">
              <div className="mt-0.5 shrink-0">
                {getActionIcon(record.action)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-medium text-slate-800">{record.initiatorName}</span>
                    <span className="text-slate-400 text-xs ml-1.5">{getRoleName(record.initiatorRole)}</span>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(record.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mt-0.5">
                  {getActionName(record.action as any)}
                  {statusLabel && <span className="text-slate-400"> · {statusLabel}</span>}
                </div>
                {record.comment && (
                  <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded">
                    {record.comment}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
