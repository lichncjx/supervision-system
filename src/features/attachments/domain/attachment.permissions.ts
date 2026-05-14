import { Role } from '@prisma/client'
import {
  canViewWorkItem,
  canOperateWorkItem,
} from '@/features/works/domain/work.permissions'
import type { AttPermUser, AttPermWorkItem, AttPermAttachment } from './attachment.types'

export function canViewAttachment(
  user: AttPermUser,
  workItem: AttPermWorkItem,
): boolean {
  return canViewWorkItem(user, workItem)
}

export function canUploadAttachment(
  user: AttPermUser,
  workItem: AttPermWorkItem,
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true

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
  user: AttPermUser,
  workItem: AttPermWorkItem,
  attachment: AttPermAttachment,
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) return true
  return attachment.userId === user.id
}
