export interface Department {
  id: number
  name: string
  code: string
  isBusiness: boolean
}

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

