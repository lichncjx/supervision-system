import type { Department } from '@/features/departments/client/department-client.types'
import type { DepartmentListResponse } from '@/features/departments/contract/department-api.types'

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
    departmentsCache = (await response.json()) as DepartmentListResponse
    return departmentsCache ?? []
  } catch {
    return []
  }
}
