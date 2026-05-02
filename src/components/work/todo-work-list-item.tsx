'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-2">
      <div className="font-medium text-gray-900 break-words whitespace-pre-wrap overflow-hidden">
        {item.workItem || item.title}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
        <div className="break-words whitespace-pre-wrap overflow-hidden">
          <span className="text-gray-500">事项提出领导：</span>
          {item.proposedLeader || '-'}
        </div>
        <div className="break-words whitespace-pre-wrap overflow-hidden">
          <span className="text-gray-500">事项提出场景：</span>
          {item.proposedScene || '-'}
        </div>
        <div>
          <span className="text-gray-500">责任部门：</span>
          {item.departmentIds && item.departmentIds.length > 0
            ? item.departmentIds.map((id: number) => getDepartmentName(id)).join('、')
            : getDepartmentName(item.departmentId ?? 0)}
        </div>
        <div>
          <span className="text-gray-500">责任部门责任人：</span>
          {item.responsiblePersons && item.responsiblePersons.length > 0
            ? item.responsiblePersons.join('、')
            : item.responsiblePerson || '-'}
        </div>
        <div>
          <span className="text-gray-500">计划完成时间：</span>
          {item.planCompleteTime || '-'}
        </div>
        <div className="break-words whitespace-pre-wrap overflow-hidden text-sm text-gray-600 max-w-full">
          <span className="text-gray-500">进展情况：</span>
          <ExpandableText text={item.progress} />
        </div>
        <div>
          <span className="text-gray-500">状态：</span>
          <StatusBadge status={item.status} />
        </div>
        {item.adjustHistory && item.adjustHistory.length > 0 && (
          <div className="text-sm text-purple-600 break-words">
            原计划完成时间：{item.adjustHistory[item.adjustHistory.length - 1].fromTime || '-'}；
            现计划完成时间：{item.adjustHistory[item.adjustHistory.length - 1].toTime || '-'}
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Link href={`/${routeType}/${item.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            查看
          </Button>
        </Link>
      </div>
    </div>
  );
}