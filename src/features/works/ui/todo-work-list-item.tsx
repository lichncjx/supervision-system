'use client';

import Link from 'next/link';
import { StatusBadge } from '@/features/works/ui/badges';
import { WorkTitle } from '@/features/works/ui/work-title';
import type { Work } from '@/features/works/client/work-client.types';

interface TodoWorkListItemProps {
  item: Work;
  routeType: string;
  getDepartmentName: (id: number) => string;
}

export function TodoWorkListItem({ item, routeType, getDepartmentName }: TodoWorkListItemProps) {
  return (
    <Link
      href={`/${routeType}/${item.id}`}
      className="block rounded-xl border border-slate-200/80 bg-white/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal-500/20"
    >
      <div className="text-sm font-semibold text-slate-800 break-words leading-snug">
        <WorkTitle work={item} />
      </div>
      <div className="mt-2 space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-600">
          <div className="inline-flex items-center gap-1">
            <span className="text-slate-400">状态：</span>
            <StatusBadge status={item.status} work={item} />
          </div>
          <div><span className="text-slate-400">完成时间：</span>{item.planCompleteTime || '-'}</div>
          <div className="max-w-full truncate"><span className="text-slate-400">事项提出场景：</span>{item.proposedScene || '-'}</div>
          <div className="max-w-full truncate"><span className="text-slate-400">进展情况：</span>{item.progress || '-'}</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-1.5 text-slate-600">
          <div><span className="text-slate-400">主责部门：</span>{getDepartmentName(item.departmentId ?? 0)}</div>
          <div><span className="text-slate-400">责任领导：</span>{item.responsibleLeader || '-'}</div>
          <div><span className="text-slate-400">主责责任人：</span>{item.responsiblePerson || '-'}</div>
        </div>
        {item.adjustHistory && item.adjustHistory.length > 0 && (
          <div className="text-xs text-purple-600 bg-purple-50/50 rounded px-2 py-1 break-words">
            原完成时间：{item.adjustHistory[item.adjustHistory.length - 1].fromTime || '-'}；
            现完成时间：{item.adjustHistory[item.adjustHistory.length - 1].toTime || '-'}
          </div>
        )}
      </div>
    </Link>
  );
}
