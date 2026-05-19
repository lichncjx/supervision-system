import type { PermissionWorkItem } from '@/features/works/domain/work.permissions'

export interface AttPermWorkItem extends PermissionWorkItem {
  departmentId: number | null
  cooperators: unknown
  status: string
  creatorId: number
  type: string
}

export interface AttPermAttachment {
  userId: number
}
