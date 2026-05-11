import type { Department } from '@/features/users/domain/user.types'

let departmentsCache: Department[] | null = null

export async function getDepartments(): Promise<Department[]> {
  if (departmentsCache) {
    return departmentsCache
  }

  try {
    const response = await fetch('/api/departments', {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) return []
    departmentsCache = await response.json()
    return departmentsCache || []
  } catch {
    return []
  }
}

export async function getDepartmentName(
  departmentId: number,
): Promise<string> {
  const depts = await getDepartments()
  return depts.find((d) => d.id === departmentId)?.name || '-'
}

export function clearDepartmentsCache() {
  departmentsCache = null
}
