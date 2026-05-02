'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { StatusBadge } from '@/components/common/badges';
import type { Work } from '@/lib/work-store';

interface PriorityMainWorkListItemProps {
  item: Work;
  routeType: string;
  getDepartmentName: (id: number) => string;
}

export function PriorityMainWorkListItem({ item, routeType, getDepartmentName }: PriorityMainWorkListItemProps) {
  return (
    <div className="space-y-2">
      <div className="font-medium text-gray-900 break-words whitespace-pre-wrap overflow-hidden">
        {item.workItem || item.title}
        {item.type === '重点' && item.isInnovation && (
          <span className="ml-2 inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
            创新工作
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
        <div className="break-words whitespace-pre-wrap overflow-hidden">
          <span className="text-gray-500">工作节点：</span>
          {item.workNode || '-'}
        </div>
        <div>
          <span className="text-gray-500">完成时间：</span>
          {item.completeTime || '-'}
        </div>
        <div>
          <span className="text-gray-500">完成形式：</span>
          {item.completeForm || '-'}
        </div>
        <div>
          <span className="text-gray-500">责任部门：</span>
          {getDepartmentName(item.departmentId ?? 0)}
        </div>
        <div>
          <span className="text-gray-500">责任领导：</span>
          {item.responsibleLeader || '-'}
        </div>
        <div>
          <span className="text-gray-500">主管人员：</span>
          {item.supervisor || '-'}
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
      {item.nodes && item.nodes.length > 0 && (
        <div className="mt-2 text-sm text-gray-600 space-y-1">
          {item.nodes.map((node: any) => (
            <div key={node.id} className="break-words">
              <div>节点：{node.title}{node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}</div>
              {node.children && node.children.length > 0 && (
                <div className="pl-4 text-gray-500">
                  {node.children.map((child: any) => (
                    <div key={child.id} className="break-words">
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