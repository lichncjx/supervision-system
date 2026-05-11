export async function getCompanyLeaders() {
  try {
    const response = await fetch('/api/users/company-leaders', {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}

export async function getUsersByDepartment(departmentId: number) {
  try {
    const response = await fetch(
      `/api/users/by-department?departmentId=${departmentId}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    )
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}

export async function getDepartmentLeaders(departmentId: number) {
  try {
    const response = await fetch(
      `/api/users/department-leaders?departmentId=${departmentId}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    )
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}

export async function getDepartmentManagers(departmentId: number) {
  try {
    const response = await fetch(
      `/api/users/department-managers?departmentId=${departmentId}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    )
    if (!response.ok) return []
    return await response.json()
  } catch {
    return []
  }
}
