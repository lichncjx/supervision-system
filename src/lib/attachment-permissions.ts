import { Role } from '@prisma/client';
import {
  canDeleteAttachment as canDeleteAttachmentByWorkPermission,
  canUploadAttachment as canUploadAttachmentByWorkPermission,
  canViewAttachment as canViewAttachmentByWorkPermission,
  type PermissionWorkItem,
} from '@/lib/server-permissions';

/** 权限判断所需的最简用户信息 */
export interface AttPermUser {
  id: number;
  role: Role;
  departmentId: number;
}

/** 权限判断所需的最简事项信息 */
export interface AttPermWorkItem extends PermissionWorkItem {
  departmentId: number | null;
  status: string;
  creatorId: number;
  type: string; // 'PRIORITY' | 'MAIN' | 'TODO'
}

/** 权限判断所需的最简附件信息 */
export interface AttPermAttachment {
  userId: number;
}

export function canViewAttachment(
  user: AttPermUser,
  workItem: AttPermWorkItem,
): boolean {
  return canViewAttachmentByWorkPermission(user, workItem);
}

export function canUploadAttachment(
  user: AttPermUser,
  workItem: AttPermWorkItem,
): boolean {
  return canUploadAttachmentByWorkPermission(user, workItem);
}

export function canDeleteAttachment(
  user: AttPermUser,
  workItem: AttPermWorkItem,
  attachment: AttPermAttachment,
): boolean {
  return canDeleteAttachmentByWorkPermission(user, workItem, attachment);
}
