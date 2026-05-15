"use client";

import { Badge } from "@/components/ui/badge";
import {
  getWorkStatusBadgeClass,
  getWorkDisplayStatusLabel,
  getWorkStatusLabel,
  isWorkStatusTerminal,
  type ReturnedDraftLike,
} from "@/features/works/domain/work-status.rules";

export function getStatusColor(status: string): string {
  return getWorkStatusBadgeClass(status);
}

export function getStatusLabel(status: string): string {
  return getWorkStatusLabel(status);
}

// 类型标签
export function getTypeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    priority: '重点工作',
    main: '主要工作',
    todo: '待办事项',
  };
  return labelMap[type] || type;
}

// 类型颜色
export function getTypeColor(type: string): string {
  const colorMap: Record<string, string> = {
    priority: 'bg-red-100 text-red-800',
    main: 'bg-blue-100 text-blue-800',
    todo: 'bg-green-100 text-green-800',
  };
  return colorMap[type] || 'bg-slate-100 text-slate-700';
}

// 时间颜色判断
export function getDateColor(priorityDate: string | null, actualDate: string | null, status: string): string {
  if (isWorkStatusTerminal(status)) {
    return 'text-slate-500';
  }

  if (!priorityDate) return 'text-gray-500';

  const now = new Date();
  const planDate = new Date(priorityDate);
  const diffDays = Math.ceil((planDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'text-red-600'; // 超期
  if (diffDays <= 7) return 'text-blue-600'; // 本周
  if (diffDays <= 30) return 'text-yellow-600'; // 本月
  if (diffDays <= 15) return 'text-orange-500'; // 半个月内
  return 'text-gray-500';
}

interface StatusBadgeProps {
  status: string;
  work?: ReturnedDraftLike;
}

export function StatusBadge({ status, work }: StatusBadgeProps) {
  return (
    <Badge className={getStatusColor(status)}>
      {getWorkDisplayStatusLabel(status, work)}
    </Badge>
  );
}

interface TypeBadgeProps {
  type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <Badge className={getTypeColor(type)}>
      {getTypeLabel(type)}
    </Badge>
  );
}

interface DateBadgeProps {
  date: string | null;
  status: string;
}

export function DateBadge({ date, status }: DateBadgeProps) {
  if (!date) return <span className="text-gray-400">-</span>;
  
  const colorClass = getDateColor(date, null, status);
  const formattedDate = new Date(date).toLocaleDateString("zh-CN");
  
  return <span className={colorClass}>{formattedDate}</span>;
}
