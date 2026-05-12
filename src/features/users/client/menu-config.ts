import type { User } from '@/lib/auth'
import { ROLES } from './user-permissions'

export function getAvailableMenus(user: User | null) {
  if (!user) return []

  const baseMenus = [
    { name: '首页', href: '/', icon: 'Home' },
    { name: '重点工作', href: '/priority', icon: 'AlertCircle' },
    { name: '主要工作', href: '/main', icon: 'Calendar' },
    { name: '待办事项', href: '/todo', icon: 'CheckSquare' },
    { name: '待处理', href: '/process', icon: 'FileText' },
    { name: '临超期', href: '/alert', icon: 'AlertTriangle' },
  ]

  if (user.role === ROLES.ADMIN) {
    baseMenus.push({
      name: '系统管理',
      href: '/admin',
      icon: 'Settings',
    })
  }

  return baseMenus
}
