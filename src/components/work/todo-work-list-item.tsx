'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';
import { StatusBadge } from '@/components/common/badges';
import { ExpandableText } from '@/components/common/expandable-text';
import type { Work } from '@/lib/work-store';

interface TodoWorkListItemProps {
  item: Work;
  routeType: string;
  getDepartmentName: (id: number) => string;
}

export function TodoWorkListItem({ item, routeType, getDepartmentName }: TodoWorkListItemProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
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
          <span className="text-slate-400">计划完成时间：</span>
          <span className="text-slate-600">{item.planCompleteTime || '-'}</span>
        </div>
        <div className="break-words text-xs text-slate-600 max-w-full">
          <span className="text-slate-400">进展情况：</span>
          <ExpandableText text={item.progress} />
        </div>
        <div>
          <span className="text-slate-400">状态：</span>
          <StatusBadge status={item.status} work={item} />
        </div>
        {item.adjustHistory && item.adjustHistory.length > 0 && (
          <div className="text-xs text-purple-600 bg-purple-50/50 rounded px-2 py-1 break-words">
            原计划完成时间：{item.adjustHistory[item.adjustHistory.length - 1].fromTime || '-'}；
            现计划完成时间：{item.adjustHistory[item.adjustHistory.length - 1].toTime || '-'}
          </div>
        )}
      </div>
      <div className="mt-3 flex justify-end">
        <Link href={`/${routeType}/${item.id}`}>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:-translate-y-0.5 transition-all">
            <Eye className="h-3.5 w-3.5" />
            查看
          </span>
        </Link>
      </div>
    </div>
  );
}
