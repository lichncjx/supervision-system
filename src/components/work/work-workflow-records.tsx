'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRoleName } from '@/lib/auth';
import { getActionName, getStatusName, getWorkflowRecordDescription } from '@/lib/work-store';

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

interface WorkWorkflowRecordsProps {
  records: WorkflowRecord[];
}

export function WorkWorkflowRecords({ records }: WorkWorkflowRecordsProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>审批记录</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {records.map((record) => {
            const recordDesc = getWorkflowRecordDescription(
              record.action,
              record.previousStatus,
              record.newStatus
            );
            const isSameStatus = record.previousStatus.toLowerCase() === record.newStatus.toLowerCase();

            return (
              <div key={record.id} className="border rounded p-3 bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{record.initiatorName}</span>
                    <span className="text-gray-500 text-sm ml-2">({getRoleName(record.initiatorRole)})</span>
                  </div>
                  <span className="text-sm text-gray-400">{new Date(record.createdAt).toLocaleString()}</span>
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
                  <div className="mt-1 text-sm text-gray-500">
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
      </CardContent>
    </Card>
  );
}
