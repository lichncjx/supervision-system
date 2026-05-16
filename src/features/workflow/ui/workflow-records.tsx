'use client';

import { getRoleName } from '@/features/users/domain/role.rules';
import { getActionName } from '@/features/works/client/work-display.utils';
import { getWorkStatusLabel } from '@/features/works/domain/work-status.rules';
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

const ACTION_COLORS: Record<string, string> = {
  submit: '#94a3b8',
  approve: '#10b981',
  reject: '#f43f5e',
  complete: '#059669',
  adjust: '#f59e0b',
  cancel: '#f59e0b',
};

function getActionColor(action: string): string {
  return ACTION_COLORS[action] ?? '#94a3b8';
}

export function WorkflowRecords({ records }: WorkflowRecordsProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <div className={PANEL_PADDED}>
      <div className="font-semibold text-slate-800 mb-3 text-[13px]">审批记录</div>

      <div>
        {records.map((record) => {
          const color = getActionColor(record.action);
          const statusLabel = record.previousStatus.toLowerCase() === record.newStatus.toLowerCase()
            ? ''
            : `${getWorkStatusLabel(record.previousStatus as any)} → ${getWorkStatusLabel(record.newStatus as any)}`;

          return (
            <div
              key={record.id}
              className="py-2.5 px-3 mb-0.5 last:mb-0"
              style={{ borderLeft: `3px solid ${color}` }}
            >
              {/* 名字 + 角色 + 时间 */}
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="text-[13px] font-semibold text-slate-900">
                  {record.initiatorName}{' '}
                  <span className="font-normal text-slate-400 text-[11px]">{getRoleName(record.initiatorRole)}</span>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(record.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* 动作 + 状态变更 */}
              <div className="text-xs font-semibold" style={{ color }}>
                {getActionName(record.action as any)}
                {statusLabel && <span className="font-normal text-slate-500"> · {statusLabel}</span>}
              </div>

              {/* 意见 */}
              {record.comment && (
                <div className="mt-1.5 bg-white border border-slate-200 rounded-md px-2.5 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-400 block mb-1">意见</span>
                  <div className="text-xs text-slate-600">{record.comment}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
