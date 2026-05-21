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
