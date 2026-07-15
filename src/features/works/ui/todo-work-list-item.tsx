'use client';

import Link from 'next/link';
import { StatusBadge } from '@/features/works/ui/badges';
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
        {item.workItem || item.title}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
        <div className="break-words">
          <span className="text-slate-400">事项提出领导：</span>
          <span className="text-slate-600">{item.proposedLeader || '-'}</span>
        </div>
        <div className="break-words">
          <span className="text-slate-400">事项提出场景：</span>
          <span className="text-slate-600">{item.proposedScene || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400">主责部门：</span>
          <span className="text-slate-600">
            {getDepartmentName(item.departmentId ?? 0)}
          </span>
        </div>
        <div>
          <span className="text-slate-400">主责责任人：</span>
          <span className="text-slate-600">
            {item.responsiblePerson || '-'}
          </span>
        </div>
        <div>
          <span className="text-slate-400">完成时间：</span>
          <span className="text-slate-600">{item.planCompleteTime || '-'}</span>
        </div>
        <div className="text-xs text-slate-600 max-w-full truncate">
          <span className="text-slate-400">进展情况：</span>
          <span className="text-slate-600">{item.progress || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400">状态：</span>
          <StatusBadge status={item.status} work={item} />
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
