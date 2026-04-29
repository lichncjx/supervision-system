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
    draft: 'bg-gray-100 text-gray-700 border border-gray-200',
    submitted: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    dept_approved: 'bg-orange-100 text-orange-800 border border-orange-200',
    company_approved: 'bg-blue-100 text-blue-800 border border-blue-200',
    active: 'bg-blue-100 text-blue-800 border border-blue-200',
    todo_pending_decompose: 'bg-amber-100 text-amber-800 border border-amber-200',
    material_submitted: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    completed: 'bg-green-100 text-green-800 border border-green-200',
    rejected: 'bg-red-100 text-red-800 border border-red-200',
    adjusting: 'bg-purple-100 text-purple-800 border border-purple-200',
    canceling: 'bg-rose-100 text-rose-800 border border-rose-200',
    ceo_pending_cancel: 'bg-red-100 text-red-800 border border-red-200',
    cancelled: 'bg-gray-200 text-gray-700 border border-gray-300',
    returned_for_edit: 'bg-red-50 text-red-700 border border-red-200',
    material_returned: 'bg-red-50 text-red-700 border border-red-200',
    adjust_returned: 'bg-red-50 text-red-700 border border-red-200',
    cancel_returned: 'bg-red-50 text-red-700 border border-red-200',
  };

  return colorMap[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
}

export function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待部门审批',
    dept_approved: '待公司审批',
    company_approved: '公司已审批',
    active: '进行中',
    todo_pending_decompose: '待部门分解',
    material_submitted: '材料待部门审批',
    completed: '已完成',
    rejected: '已退回',
    adjusting: '调整审批中',
    canceling: '取消待公司审批',
    ceo_pending_cancel: '待一把手审批取消',
    cancelled: '已取消',
    returned_for_edit: '退回待修改',
    material_returned: '材料退回待补充',
    adjust_returned: '调整退回待修改',
    cancel_returned: '取消申请退回',
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
  return colorMap[type] || 'bg-gray-100 text-gray-800';
}

// 时间颜色判断
export function getDateColor(priorityDate: string | null, actualDate: string | null, status: string): string {
  if (status === ITEM_STATUS.COMPLETED || status === ITEM_STATUS.CANCELLED) {
    return 'text-gray-500';
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
