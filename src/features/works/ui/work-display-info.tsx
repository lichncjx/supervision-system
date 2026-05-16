'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Work } from '@/features/works/client/work-view.types';
import { DISPLAY_LABEL, DETAIL_THEME, type DetailThemeKey } from './visual-tokens';

interface WorkDisplayInfoProps {
  work: Work;
  departments: Array<{ id: number; name: string }>;
  hideNodes?: boolean;
  hideCooperators?: boolean;
}

function getDepartmentName(
  departments: Array<{ id: number; name: string }>,
  id: number,
): string {
  return departments.find((d) => d.id === id)?.name || '-';
}

function getDetailThemeKey(type: Work['type']): DetailThemeKey {
  if (type === '重点') return 'priority';
  if (type === '主要') return 'main';
  return 'todo';
}

function DetailSection({
  title,
  accentColor,
  variant = 'default',
  children,
}: {
  title: string;
  accentColor: string;
  variant?: 'default' | 'muted';
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        background: variant === 'muted' ? `${accentColor}15` : '#fafafa',
        border: `1px solid ${accentColor}30`,
        borderLeft: `3px solid ${accentColor}`,
        ...(variant === 'muted' ? { opacity: 0.85 } : {}),
      }}
    >
      <div
        className="text-[11px] font-bold uppercase tracking-wider mb-2"
        style={{ color: accentColor }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailLongText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <span className={DISPLAY_LABEL}>{label}</span>
      <p className="mt-1 text-sm text-slate-700 leading-relaxed bg-white px-3 py-2 rounded-md border border-slate-200 whitespace-pre-wrap break-words">
        {value || '-'}
      </p>
    </div>
  );
}

function PriorityMainWorkDisplayInfo({ work, departments, hideNodes }: WorkDisplayInfoProps) {
  const themeKey = getDetailThemeKey(work.type);
  const theme = DETAIL_THEME[themeKey];
  const firstSubmitterName = work.firstSubmitterName || work.creatorName || '-';

  return (
    <div className="space-y-3">
      <DetailSection title="主要内容" accentColor={theme.deep}>
        <DetailLongText label="工作计划" value={work.workPlan || '-'} />
        <DetailLongText label="进展情况" value={work.progress || '-'} />
      </DetailSection>

      <DetailSection title="责任详情" accentColor={theme.mid}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <span className={DISPLAY_LABEL}>主责部门</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {getDepartmentName(departments, work.departmentId ?? 0)}
            </div>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任领导</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {work.responsibleLeader || '-'}
            </div>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任人员</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {work.responsiblePerson || '-'}
            </div>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>起草人员</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {firstSubmitterName}
            </div>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="辅助信息" accentColor={theme.light} variant="muted">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-500">
          <div>业务类别：{work.businessCategory || '-'}</div>
          <div>工作节点：{work.workNode || '-'}</div>
          <div>完成形式：{work.completeForm || '-'}</div>
          {work.type === '重点' && (
            <div>创新工作：{work.isInnovation ? '是' : '否'}</div>
          )}
        </div>
      </DetailSection>

      {work.rejectReason && (
        <div className="p-3 bg-rose-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
          <div>退回人：{work.rejectedBy || '-'}</div>
          <div>退回原因：{work.rejectReason}</div>
          {work.rejectedAt && (
            <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
          )}
        </div>
      )}

      {!hideNodes && work.nodes && work.nodes.length > 0 && (
        <div>
          <p className="font-medium mb-2">工作节点：</p>
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
              <div>原完成时间：{item.fromTime || '-'}</div>
              <div>现完成时间：{item.toTime || '-'}</div>
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

function TodoWorkDisplayInfo({ work, departments, hideNodes, hideCooperators }: WorkDisplayInfoProps) {
  const theme = DETAIL_THEME.todo;
  const firstSubmitterName = work.firstSubmitterName || work.creatorName || '-';

  return (
    <div className="space-y-3">
      <DetailSection title="主要内容" accentColor={theme.deep}>
        <DetailLongText label="工作计划" value={work.workPlan || '-'} />
        <DetailLongText label="进展情况" value={work.progress || '-'} />
      </DetailSection>

      <DetailSection title="责任详情" accentColor={theme.mid}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <span className={DISPLAY_LABEL}>主责部门</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {getDepartmentName(departments, work.departmentId ?? 0)}
            </div>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任领导</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {work.responsibleLeader || '-'}
            </div>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>责任人员</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {work.responsiblePerson || '-'}
            </div>
          </div>
          <div>
            <span className={DISPLAY_LABEL}>起草人员</span>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
              {firstSubmitterName}
            </div>
          </div>
        </div>
        {!hideCooperators && work.cooperators && work.cooperators.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <span className={DISPLAY_LABEL}>配合部门</span>
                <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {work.cooperators.map((c: any) => departments.find((d) => d.id === c.departmentId)?.name || c.departmentName || '-').join('、')}
                </div>
              </div>
              <div>
                <span className={DISPLAY_LABEL}>配合人员</span>
                <div className="mt-0.5 text-[13px] font-semibold text-slate-900">
                  {work.cooperators.map((c: any) => [c.leader, c.person].filter(Boolean).join(' · ')).filter(Boolean).join('、')}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailSection>

      <DetailSection title="辅助信息" accentColor={theme.light} variant="muted">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-500">
          {work.proposedLeader && <div>提出领导：{work.proposedLeader}</div>}
          {work.proposedScene && <div>提出场景：{work.proposedScene}</div>}
          {work.formedTime && <div>形成时间：{work.formedTime}</div>}
          {work.workNode && <div>工作节点：{work.workNode}</div>}
        </div>
      </DetailSection>

      {!hideNodes && work.nodes && work.nodes.length > 0 && (
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

export function WorkDisplayInfo({ work, departments, hideNodes, hideCooperators }: WorkDisplayInfoProps) {
  const isTodo = work.type === '待办';

  if (isTodo) {
    return <TodoWorkDisplayInfo work={work} departments={departments} hideNodes={hideNodes} hideCooperators={hideCooperators} />;
  }
  return <PriorityMainWorkDisplayInfo work={work} departments={departments} hideNodes={hideNodes} />;
}
