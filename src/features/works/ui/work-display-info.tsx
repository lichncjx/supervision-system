'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExpandableText } from '@/components/common/expandable-text';
import { StatusBadge } from '@/features/works/ui/badges';
import { getCurrentProcessDescription, type Work } from '@/lib/work-store';
import { DISPLAY_LABEL } from './visual-tokens';

interface WorkDisplayInfoProps {
  work: Work;
  departments: Array<{ id: number; name: string }>;
}

function getDepartmentName(
  departments: Array<{ id: number; name: string }>,
  id: number,
): string {
  return departments.find((d) => d.id === id)?.name || '-';
}

function PriorityMainWorkDisplayInfo({ work, departments }: WorkDisplayInfoProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <div>
          <span className={DISPLAY_LABEL}>业务类别：</span>
          <span>{work.businessCategory || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>工作事项：</span>
          <span>{work.workItem || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>工作节点：</span>
          <span>{work.workNode || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>计划完成时间：</span>
          <span>{work.completeTime || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>完成形式：</span>
          <span>{work.completeForm || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>主办部门：</span>
          <span>{getDepartmentName(departments, work.departmentId ?? 0)}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>责任领导：</span>
          <span>{work.responsibleLeader || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>责任人：</span>
          <span>{work.responsiblePerson || '-'}</span>
        </div>
        {work.type === '重点' && (
          <div>
            <span className={DISPLAY_LABEL}>是否为创新工作：</span>
            <span>{work.isInnovation ? '是' : '否'}</span>
          </div>
        )}
        <div>
          <span className={DISPLAY_LABEL}>当前状态：</span>
          <StatusBadge status={work.status} work={work} />
        </div>
        <div>
          <span className={DISPLAY_LABEL}>当前环节：</span>
          <span className="text-blue-600">{getCurrentProcessDescription(
            work.status,
            work.currentApproverRole,
            work.currentApproverId
          )}</span>
        </div>
      </div>

      {work.rejectReason && (
        <div className="p-3 bg-rose-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
          <div>退回人：{work.rejectedBy || '-'}</div>
          <div>退回原因：{work.rejectReason}</div>
          {work.rejectedAt && (
            <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
          )}
        </div>
      )}

      <div>
        <p className="font-medium mb-2">工作节点：</p>
        {work.nodes && work.nodes.length > 0 ? (
          <div className="space-y-3">
            {work.nodes.map((node: any, index: number) => (
              <div key={node.id ?? index} className="border border-slate-200 bg-slate-50/70 rounded-lg p-3">
                <div className="font-medium break-words">
                  {index + 1}. {node.title}
                  {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                </div>
                {node.children && node.children.length > 0 && (
                  <div className="pl-5 mt-2 space-y-1 text-sm text-slate-500">
                    {node.children.map((child: any, childIndex: number) => (
                      <div key={child.id ?? `${index}-${childIndex}`} className="break-words">
                        {index + 1}.{childIndex + 1} {child.title}
                        {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={DISPLAY_LABEL}>暂无工作节点</p>
        )}
      </div>

      {work.proof && (
        <div>
          <span className={DISPLAY_LABEL}>见证材料说明：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
        </div>
      )}
      {(() => {
        const evidenceAttachments = (work.attachments || []).filter((a: any) => a.category === 'evidence');
        if (evidenceAttachments.length === 0) return null;
        return (
          <div>
            <span className={DISPLAY_LABEL}>见证材料附件：</span>
            <div className="mt-2 space-y-2">
              {evidenceAttachments.map((att: any, i: number) => (
                <div key={att.id ?? i} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{att.fileName}</div>
                    <div className="text-xs text-slate-500">
                      上传人：{att.userName || '-'}
                      上传时间：{att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {work.adjustReason && (
        <div>
          <p className="break-words whitespace-pre-wrap overflow-hidden">
            调整原因：{work.adjustReason}
          </p>
        </div>
      )}
      {work.adjustNewTime && (
        <p>
          调整后时间：{work.adjustNewTime}
        </p>
      )}
      {work.adjustHistory && work.adjustHistory.length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-700 space-y-2">
          <div className="font-medium">调整记录</div>
          {(work.adjustHistory as any[]).map((item, i: number) => (
            <div key={item.id ?? i} className="border-t border-purple-100 pt-2 first:border-t-0 first:pt-0">
              <div>调整原因：{item.reason || '-'}</div>
              <div>原计划完成时间：{item.fromTime || '-'}</div>
              <div>现计划完成时间：{item.toTime || '-'}</div>
              <div>审批人：{item.approvedBy || '-'}</div>
              <div>审批时间：{item.approvedAt ? new Date(item.approvedAt).toLocaleString() : '-'}</div>
            </div>
          ))}
        </div>
      )}
      {work.cancelReason && (
        <div>
          <span className={DISPLAY_LABEL}>取消原因：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
        </div>
      )}
    </div>
  );
}

function TodoWorkDisplayInfo({ work, departments }: WorkDisplayInfoProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className={DISPLAY_LABEL}>事项提出领导：</span>
          <span>{work.proposedLeader || '-'}</span>
          <span className="text-xs text-slate-400 ml-2">（提出该待办事项，默认也是审批领导）</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>事项提出场景：</span>
          <span>{work.proposedScene || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>待办事项：</span>
          <span>{work.workItem || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>形成时间：</span>
          <span>{work.formedTime || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>主责部门：</span>
          <span>{getDepartmentName(departments, work.departmentId ?? 0)}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>责任领导：</span>
          <span>{work.responsibleLeader || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>责任人：</span>
          <span>{work.responsiblePerson || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>配合部门：</span>
          <span>
            {work.cooperators && work.cooperators.length > 0
              ? work.cooperators.map((c: any) => getDepartmentName(departments, c.departmentId) || c.departmentName).join('、')
              : '-'}
          </span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>配合责任人：</span>
          <span>
            {work.cooperators && work.cooperators.length > 0
              ? work.cooperators.map((c: any) => c.person).filter(Boolean).join('、')
              : '-'}
          </span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>工作计划：</span>
          <span>{work.workPlan || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>计划完成时间：</span>
          <span>{work.planCompleteTime || '-'}</span>
        </div>
        <div>
          <span className={DISPLAY_LABEL}>进展情况：</span>
          <ExpandableText text={work.progress} />
        </div>
        <div>
          <span className={DISPLAY_LABEL}>当前状态：</span>
          <StatusBadge status={work.status} work={work} />
        </div>
        <div>
          <span className={DISPLAY_LABEL}>当前环节：</span>
          <span className="text-blue-600">{getCurrentProcessDescription(
            work.status,
            work.currentApproverRole,
            work.currentApproverId
          )}</span>
        </div>
      </div>

      {work.nodes && work.nodes.length > 0 && (
        <div>
          <p className="font-medium mb-2">任务分解节点：</p>
          <div className="space-y-3">
            {work.nodes.map((node: any, index: number) => (
              <div key={node.id ?? index} className="border border-slate-200 bg-slate-50/70 rounded-lg p-3">
                <div className="font-medium break-words">
                  {index + 1}. {node.title}
                  {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                </div>
                {node.children && node.children.length > 0 && (
                  <div className="pl-5 mt-2 space-y-1 text-sm text-slate-500">
                    {node.children.map((child: any, childIndex: number) => (
                      <div key={child.id ?? `${index}-${childIndex}`} className="break-words">
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

      {work.rejectReason && (
        <div className="p-3 bg-rose-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
          <div>退回人：{work.rejectedBy || '-'}</div>
          <div>退回原因：{work.rejectReason}</div>
          {work.rejectedAt && (
            <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
          )}
        </div>
      )}

      {work.proof && (
        <div>
          <span className={DISPLAY_LABEL}>见证材料说明：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
        </div>
      )}
      {(() => {
        const evidenceAttachments = (work.attachments || []).filter((a: any) => a.category === 'evidence');
        if (evidenceAttachments.length === 0) return null;
        return (
          <div>
            <span className={DISPLAY_LABEL}>见证材料附件：</span>
            <div className="mt-2 space-y-2">
              {evidenceAttachments.map((att: any, i: number) => (
                <div key={att.id ?? i} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium break-words">{att.fileName}</div>
                    <div className="text-xs text-slate-500">
                      上传人：{att.userName || '-'}
                      上传时间：{att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}
                    </div>
                  </div>
                  <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {work.adjustReason && (
        <div>
          <p className="break-words whitespace-pre-wrap overflow-hidden">
            调整原因：{work.adjustReason}
          </p>
        </div>
      )}
      {work.adjustNewTime && (
        <p>
          调整后时间：{work.adjustNewTime}
        </p>
      )}
      {work.cancelReason && (
        <div>
          <span className={DISPLAY_LABEL}>取消原因：</span>
          <p className="mt-1 p-2 bg-slate-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
        </div>
      )}
    </div>
  );
}

export function WorkDisplayInfo({ work, departments }: WorkDisplayInfoProps) {
  const isTodo = work.type === '待办';

  if (isTodo) {
    return <TodoWorkDisplayInfo work={work} departments={departments} />;
  }
  return <PriorityMainWorkDisplayInfo work={work} departments={departments} />;
}
