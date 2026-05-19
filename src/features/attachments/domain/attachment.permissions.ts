import {
  canViewWorkItem,
  canOperateWorkItem,
  type PermissionUser,
} from '@/features/works/domain/work.permissions'
import { isGlobalView } from '@/features/users/domain/role.rules'
import type { AttPermWorkItem, AttPermAttachment } from './attachment.types'

export function canViewAttachment(
  user: PermissionUser,
  workItem: AttPermWorkItem,
): boolean {
  return canViewWorkItem(user, workItem)
}

export function canUploadAttachment(
  user: PermissionUser,
  workItem: AttPermWorkItem,
): boolean {
  if (isGlobalView(user.role)) return true

  const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED']
  if (
    TERMINAL_STATUSES.includes(
      String(workItem.status || '').toUpperCase(),
    )
  )
    return false

  return canOperateWorkItem(user, workItem)
}

export function canDeleteAttachment(
  user: PermissionUser,
  workItem: AttPermWorkItem,
  attachment: AttPermAttachment,
): boolean {
  if (isGlobalView(user.role)) return true
  return attachment.userId === user.id
}
