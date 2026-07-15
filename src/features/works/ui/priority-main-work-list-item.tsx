'use client';

import Link from 'next/link';
import { StatusBadge } from '@/features/works/ui/badges';
import type { Work } from '@/features/works/client/work-client.types';

interface PriorityMainWorkListItemProps {
  item: Work;
  routeType: string;
  getDepartmentName: (id: number) => string;
}

export function PriorityMainWorkListItem({ item, routeType, getDepartmentName }: PriorityMainWorkListItemProps) {
  return (
    <Link
      href={`/${routeType}/${item.id}`}
      className="block rounded-xl border border-slate-200/80 bg-white/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sky-500/20"
    >
      <div className="text-sm font-semibold text-slate-800 break-words leading-snug">
        {item.title || item.workItem}
        {item.isInnovation && (
          <span className="ml-2 inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 text-xs font-medium">
            创新工作
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
        <div>
          <span className="text-slate-400">完成时间：</span>
          <span className="text-slate-600">{item.planCompleteTime || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400">完成形式：</span>
          <span className="text-slate-600">{item.completeForm || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400">责任部门：</span>
          <span className="text-slate-600">{getDepartmentName(item.departmentId ?? 0)}</span>
        </div>
        <div>
          <span className="text-slate-400">责任领导：</span>
          <span className="text-slate-600">{item.responsibleLeader || '-'}</span>
        </div>
        <div>
          <span className="text-slate-400">责任人：</span>
          <span className="text-slate-600">{item.responsiblePerson || '-'}</span>
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
