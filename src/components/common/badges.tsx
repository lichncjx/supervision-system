"use client";

import { Badge } from "@/components/ui/badge";

// 状态常量
const ITEM_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  ACTIVE: "active",
  PENDING_COMPLETE: "pending_complete",
  COMPLETED: "completed",
  ADJUSTING: "adjusting",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
  PENDING_DECOMPOSE: "pending_decompose",
  DECOMPOSED: "decomposed",
} as const;

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border border-slate-200',
    pending_dept: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    pending_company: 'bg-orange-100 text-orange-800 border border-orange-200',
    approved: 'bg-blue-100 text-blue-800 border border-blue-200',
    in_progress: 'bg-blue-100 text-blue-800 border border-blue-200',
    pending_decompose: 'bg-amber-100 text-amber-800 border border-amber-200',
    pending_complete: 'bg-orange-100 text-orange-800 border border-orange-200',
    pending_evidence_dept: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    pending_evidence_company: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    pending_main_leader_cancel: 'bg-red-100 text-red-800 border border-red-200',
    completed: 'bg-green-100 text-green-800 border border-green-200',
    rejected: 'bg-red-100 text-red-800 border border-red-200',
    adjusting: 'bg-purple-100 text-purple-800 border border-purple-200',
    cancelling: 'bg-rose-100 text-rose-800 border border-rose-200',
    cancelled: 'bg-slate-200 text-slate-700 border border-slate-300',
  };

  return colorMap[status] || 'bg-slate-100 text-slate-700 border border-slate-200';
}

export function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    draft: '草稿',
    pending_dept: '待部门审批',
    pending_company: '待公司审批',
    approved: '已审批',
    in_progress: '进行中',
    pending_decompose: '待分解',
    pending_complete: '待完成',
    pending_evidence_dept: '待部门见证审批',
    pending_evidence_company: '待公司见证审批',
    pending_main_leader_cancel: '待一把手审批取消',
    completed: '已完成',
    rejected: '已退回',
    adjusting: '调整审批中',
    cancelling: '取消审批中',
    cancelled: '已取消',
  };

  return labelMap[status] || status;
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
  if (status === ITEM_STATUS.COMPLETED || status === ITEM_STATUS.CANCELLED) {
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
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={getStatusColor(status)}>
      {getStatusLabel(status)}
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
