export interface SystemSettings {
  defaultAssessmentYear: number
  dashboardNotice: string | null
  updatedAt: string | null
  updatedBy: { id: number; name: string } | null
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await fetch('/api/system-settings', { credentials: 'include', cache: 'no-store' })
  if (!response.ok) throw new Error('读取系统设置失败')
  return response.json() as Promise<SystemSettings>
}

export async function updateSystemSettings(input: {
  defaultAssessmentYear: number
  dashboardNotice: string
  updatedAt: string | null
}): Promise<SystemSettings> {
  const response = await fetch('/api/system-settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '保存系统设置失败' }))
    throw new Error(error.message || '保存系统设置失败')
  }
  return response.json() as Promise<SystemSettings>
}
