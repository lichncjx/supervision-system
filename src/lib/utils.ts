import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 将 YYYY-MM-DD 日期字符串转为 UTC 零点的 Date 对象
 */
export function convertToDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * 处理工作节点数据，格式化其中的日期
 */
export function processNodesForDisplay(nodes: any[]) {
  return nodes.map(node => ({
    ...node,
    completeTime: formatDate(node.completeTime),
    children: node.children ? node.children.map((child: any) => ({
      ...child,
      completeTime: formatDate(child.completeTime)
    })) : []
  }));
}

/**
 * 处理调整历史数据，格式化其中的日期
 */
export function processAdjustHistory(history: any[]) {
  return history.map(item => ({
    ...item,
    fromTime: formatDate(item.fromTime),
    toTime: formatDate(item.toTime),
    approvedAt: formatDate(item.approvedAt),
  }));
}
