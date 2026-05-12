import type { User, Role, LoginResult } from '@/features/users/domain/user.types'

export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || '登录失败' }
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        username: data.user.username,
        name: data.user.name,
        role: data.user.role as Role,
        departmentId: data.user.departmentId,
        departmentName: data.user.departmentName,
        isActive: data.user.isActive,
      },
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, error: '网络错误，请稍后重试' }
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Logout error:', error)
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      role: data.role as Role,
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      isActive: data.isActive,
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ oldPassword, newPassword }),
      credentials: 'include',
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || '修改密码失败' }
    }

    return { success: true }
  } catch (error) {
    console.error('Change password error:', error)
    return { success: false, error: '网络错误，请稍后重试' }
  }
}
