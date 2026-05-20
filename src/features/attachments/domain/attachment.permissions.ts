import {
  canViewWorkItem,
  canOperateWorkItem,
  type PermissionUser,
  type PermissionWorkItem,
} from '@/features/works/domain/work.permissions'
import { isGlobalView } from '@/features/users/domain/role.rules'
import { isTerminal } from '@/features/works/domain/work-status.rules'

export function canViewAttachment(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  return canViewWorkItem(user, workItem)
}

export function canUploadAttachment(
  user: PermissionUser,
  workItem: PermissionWorkItem,
): boolean {
  if (isGlobalView(user.role)) return true
  if (isTerminal(workItem.status)) return false
  return canOperateWorkItem(user, workItem)
}

export function canDeleteAttachment(
  user: PermissionUser,
  attachmentUserId: number,
): boolean {
  if (isGlobalView(user.role)) return true
  return attachmentUserId === user.id
}
