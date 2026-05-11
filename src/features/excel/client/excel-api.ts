let departmentsCache: Array<{ id: number; name: string; code: string; isBusiness: boolean }> | null = null
let companyLeadersCache: Array<{ id: number; name: string; role: string }> | null = null

export async function getDepartmentsForExcel() {
  if (departmentsCache) return departmentsCache
  try {
    const response = await fetch('/api/departments', { credentials: 'include' })
    if (response.ok) {
      departmentsCache = await response.json()
    }
  } catch {
    // keep cache as null on error
  }
  return departmentsCache || []
}

export async function getCompanyLeadersForExcel() {
  if (companyLeadersCache) return companyLeadersCache
  try {
    const response = await fetch('/api/users/company-leaders', {
      credentials: 'include',
    })
    if (response.ok) {
      companyLeadersCache = await response.json()
    }
  } catch {
    // keep cache as null on error
  }
  return companyLeadersCache || []
}

export async function getDepartmentNameForExcel(id?: number) {
  if (!id) return ''
  const departments = await getDepartmentsForExcel()
  return departments.find((d) => d.id === id)?.name || ''
}
