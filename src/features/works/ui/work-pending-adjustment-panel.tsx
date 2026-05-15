'use client';

import type { Work } from '@/features/works/client/work-view.types';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkPendingAdjustmentPanelProps {
  work: Work;
}

export function WorkPendingAdjustmentPanel({ work }: WorkPendingAdjustmentPanelProps) {
  if (!work.pendingAdjustment) {
    return null;
  }

  return (
    <div className={PANEL_PADDED}>
      <h3 className="font-semibold text-slate-800 mb-4">待审批调整内容</h3>
      <div className="space-y-2 text-sm">
        <div className="text-purple-600 break-words whitespace-pre-wrap">
          调整原因：{work.pendingAdjustmentReason || '-'}
        </div>
        <div>
          原完成时间：{work.pendingAdjustmentFromTime || '-'}
        </div>
        <div>
          现完成时间：{work.pendingAdjustmentToTime || '-'}
        </div>
        <div>
          公司审批领导：{work.approvalLeader || '-'}
        </div>
        <div className="break-words whitespace-pre-wrap">
          调整后事项：{work.pendingAdjustment.workItem || work.pendingAdjustment.title || '-'}
        </div>
        <div>
          调整后完成时间：{work.pendingAdjustment.planCompleteTime || '-'}
        </div>
        <div>
          调整后完成形式：{work.pendingAdjustment.completeForm || '-'}
        </div>
        {work.pendingAdjustment.nodes && work.pendingAdjustment.nodes.length > 0 && (
          <div>
            <p className="font-medium mt-2">调整后节点：</p>
            <div className="space-y-2">
              {work.pendingAdjustment.nodes.map((node: any, index: number) => (
                <div key={node.id} className="border border-slate-200 bg-slate-50/70 rounded-lg p-3">
                  <div className="font-medium break-words">
                    {index + 1}. {node.title}
                  </div>
                  {node.children && node.children.length > 0 && (
                    <div className="pl-4 mt-1 space-y-1 text-sm text-slate-600">
                      {node.children.map((child: any, childIndex: number) => (
                        <div key={child.id} className="break-words">
                          {index + 1}.{childIndex + 1} {child.title}
                          {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
