'use client';

import { getRoleName } from '@/lib/auth';
import { getActionName, getStatusName, getWorkflowRecordDescription } from '@/lib/work-store';
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

export function WorkflowRecords({ records }: WorkflowRecordsProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <div className={PANEL_PADDED}>
      <h3 className="font-semibold text-slate-800 mb-4">审批记录</h3>
      <div>
        <div className="space-y-3">
          {records.map((record) => {
            const recordDesc = getWorkflowRecordDescription(
              record.action,
              record.previousStatus,
              record.newStatus
            );
            const isSameStatus = record.previousStatus.toLowerCase() === record.newStatus.toLowerCase();

            return (
              <div key={record.id} className="rounded-lg bg-white/60 border border-slate-200 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{record.initiatorName}</span>
                    <span className="text-slate-500 text-sm ml-2">({getRoleName(record.initiatorRole)})</span>
                  </div>
                  <span className="text-sm text-slate-400">{new Date(record.createdAt).toLocaleString()}</span>
                </div>
                <div className="mt-1">
                  <span className="text-blue-600">{getActionName(record.action as any)}</span>
                </div>
                {recordDesc && (
                  <div className="mt-1 text-sm text-purple-700">
                    说明：{recordDesc}
                  </div>
                )}
                {isSameStatus && !recordDesc && (
                  <div className="mt-1 text-sm text-slate-500">
                    当前记录为流程节点流转，事项状态未最终变化
                  </div>
                )}
                <div className="mt-1 text-sm text-gray-600">
                  状态变更：{getStatusName(record.previousStatus as any)} → {getStatusName(record.newStatus as any)}
                </div>
                {record.comment && (
                  <div className="mt-2 text-sm bg-white p-2 rounded">
                    意见：{record.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
