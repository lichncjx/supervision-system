'use client';

import React from 'react';
import type { Work } from '@/features/works/client/work-client.types';
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

function ProcessReasonBlock({
  tone,
  title,
  meta,
  reason,
}: {
  tone: 'danger' | 'muted';
  title: string;
  meta?: string;
  reason: string;
}) {
  const classes =
    tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${classes}`}>
      <div className="text-[11px] font-semibold text-current opacity-70 mb-1">
        {title}
      </div>
      {meta && (
        <div className="mb-1 text-xs opacity-80 break-words">
          {meta}
        </div>
      )}
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {reason || '-'}
      </div>
    </div>
  );
}

function PriorityMainWorkDisplayInfo({
  work,
  departments,
  hideNodes,
}: WorkDisplayInfoProps) {
  const themeKey = getDetailThemeKey(work.type);
  const theme = DETAIL_THEME[themeKey];
  const firstSubmitterName = work.firstSubmitterName || work.creatorName || '-';

  return (
    <div className="space-y-3">
      {work.description && (
        <DetailSection title="主要内容" accentColor={theme.deep}>
          <DetailLongText label="事项说明" value={work.description} />
        </DetailSection>
      )}

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
          <div>完成形式：{work.completeForm || '-'}</div>
          {work.type === '重点' && (
            <div>创新工作：{work.isInnovation ? '是' : '否'}</div>
          )}
        </div>
      </DetailSection>

      {work.rejectReason && (
        <ProcessReasonBlock
          tone="danger"
          title="退回原因"
          meta={`退回人：${work.rejectedBy || '-'}`}
          reason={work.rejectReason}
        />
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

      {work.cancelReason && (
        <ProcessReasonBlock
          tone="muted"
          title="取消原因"
          reason={work.cancelReason}
        />
      )}
    </div>
  );
}

function TodoWorkDisplayInfo({
  work,
  departments,
  hideNodes,
  hideCooperators,
}: WorkDisplayInfoProps) {
  const theme = DETAIL_THEME.todo;
  const firstSubmitterName = work.firstSubmitterName || work.creatorName || '-';
  const cooperatorRows = (work.cooperators || []).map((c: any) => ({
    departmentName: departments.find((d) => d.id === c.departmentId)?.name || c.departmentName || '-',
    people: [c.leader, c.person].filter(Boolean).join(' · ') || '-',
  }));

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
        {!hideCooperators && cooperatorRows.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <span className={DISPLAY_LABEL}>配合部门</span>
                <div className="mt-0.5 space-y-1 text-[13px] font-semibold text-slate-900">
                  {cooperatorRows.map((row, index) => (
                    <div key={`${row.departmentName}-${index}`} className="break-words">
                      {row.departmentName}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <span className={DISPLAY_LABEL}>配合人员</span>
                <div className="mt-0.5 space-y-1 text-[13px] font-semibold text-slate-900">
                  {cooperatorRows.map((row, index) => (
                    <div key={`${row.departmentName}-people-${index}`} className="break-words">
                      {row.people}
                    </div>
                  ))}
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
        <ProcessReasonBlock
          tone="danger"
          title="退回原因"
          meta={`退回人：${work.rejectedBy || '-'}`}
          reason={work.rejectReason}
        />
      )}

      {work.cancelReason && (
        <ProcessReasonBlock
          tone="muted"
          title="取消原因"
          reason={work.cancelReason}
        />
      )}
    </div>
  );
}

export function WorkDisplayInfo({
  work,
  departments,
  hideNodes,
  hideCooperators,
}: WorkDisplayInfoProps) {
  const isTodo = work.type === '待办';

  if (isTodo) {
    return (
      <TodoWorkDisplayInfo
        work={work}
        departments={departments}
        hideNodes={hideNodes}
        hideCooperators={hideCooperators}
      />
    );
  }
  return (
    <PriorityMainWorkDisplayInfo
      work={work}
      departments={departments}
      hideNodes={hideNodes}
    />
  );
}
