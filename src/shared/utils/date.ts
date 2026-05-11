/**
 * 将 YYYY-MM-DD 日期字符串转为 UTC 零点的 Date 对象
 */
export function convertToDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return null
  return new Date(dateStr + 'T00:00:00.000Z')
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 */
export function formatDate(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}
