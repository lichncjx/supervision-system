import { formatDate } from '@/shared/utils/date'

/**
 * 处理工作节点数据，格式化其中的日期
 */
export function processNodesForDisplay(nodes: any[]) {
  return nodes.map((node) => ({
    ...node,
    completeTime: formatDate(node.completeTime),
    children: node.children
      ? node.children.map((child: any) => ({
          ...child,
          completeTime: formatDate(child.completeTime),
        }))
      : [],
  }))
}

/**
 * 处理调整历史数据，格式化其中的日期
 */
export function processAdjustHistory(history: any[]) {
  return history.map((item) => ({
    ...item,
    fromTime: formatDate(item.fromTime),
    toTime: formatDate(item.toTime),
    approvedAt: formatDate(item.approvedAt),
  }))
}
