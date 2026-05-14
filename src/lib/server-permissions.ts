export {
  canViewWorkItem,
  canAccessWorkItem,
  canApproveWorkItem,
  canHandleWorkItem,
  canOperateWorkItem,
  canEditWorkItem,
  canCreateWork,
  canDeleteWork,
  getResponsibleDepartmentIds,
  getCooperatorDepartmentIds,
  getCooperateDepartmentIds,
  isWorkRelatedToDepartment,
  isWorkMainResponsibleDepartment,
  buildWorkVisibilityWhere,
} from '@/features/works/domain/work.permissions'
export type {
  PermissionUser,
  PermissionWorkItem,
} from '@/features/works/domain/work.permissions'

export {
  canUploadAttachment,
  canViewAttachment,
  canDeleteAttachment,
} from '@/features/attachments/domain/attachment.permissions'

export {
  isGlobalViewRole,
  isCompanyLevelRole,
  isDepartmentLevelRole,
  canImportData,
  canExportData,
} from '@/features/users/domain/role.rules'

export { getDepartmentIdsForUser } from '@/features/departments/infrastructure/department.repository'
