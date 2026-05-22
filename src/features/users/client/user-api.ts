import type { User } from '@/features/users/client/user-client.types'
import type {
  CompanyLeadersResponse,
  DepartmentUsersResponse,
  UserApiDto,
} from '@/features/users/contract/user-api.types'

function toClientUser(user: UserApiDto): User {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: user.departmentName,
  }
}

export async function getCompanyLeaders(): Promise<User[]> {
  try {
    const response = await fetch('/api/users/company-leaders', {
      method: 'GET',
      credentials: 'include',
    })
    if (!response.ok) return []
    const data = (await response.json()) as CompanyLeadersResponse
    return data.map(toClientUser)
  } catch {
    return []
  }
}

export async function getDepartmentLeaders(departmentId: number): Promise<User[]> {
  try {
    const response = await fetch(
      `/api/users/department-leaders?departmentId=${departmentId}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    )
    if (!response.ok) return []
    const data = (await response.json()) as DepartmentUsersResponse
    return data.map(toClientUser)
  } catch {
    return []
  }
}

export async function getDepartmentManagers(departmentId: number): Promise<User[]> {
  try {
    const response = await fetch(
      `/api/users/department-managers?departmentId=${departmentId}`,
      {
        method: 'GET',
        credentials: 'include',
      },
    )
    if (!response.ok) return []
    const data = (await response.json()) as DepartmentUsersResponse
    return data.map(toClientUser)
  } catch {
    return []
  }
}
