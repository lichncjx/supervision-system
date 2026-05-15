'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';
import { StatusBadge } from '@/features/works/ui/badges';
import type { Work } from '@/lib/work-store';

interface PriorityMainWorkListItemProps {
  item: Work;
  routeType: string;
  getDepartmentName: (id: number) => string;
}

export function PriorityMainWorkListItem({ item, routeType, getDepartmentName }: PriorityMainWorkListItemProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="text-sm font-semibold text-slate-800 break-words leading-snug">
        {item.workItem || item.title}
        {item.isInnovation && (
          <span className="ml-2 inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 text-xs font-medium">
            创新工作
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-2">
        <div className="break-words">
          <span className="text-slate-400">工作节点：</span>
          <span className="text-slate-600">{item.workNode || '-'}</span>
        </div>
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
      {item.nodes && item.nodes.length > 0 && (
        <div className="mt-2 text-xs text-slate-600 space-y-1">
          {item.nodes.map((node: any, i: number) => (
            <div key={node.id || i} className="break-words">
              <div>节点：{node.title}{node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}</div>
              {node.children && node.children.length > 0 && (
                <div className="pl-4 text-slate-500">
                  {node.children.map((child: any, j: number) => (
                    <div key={child.id || j} className="break-words">
                      - {child.title}
                      {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
