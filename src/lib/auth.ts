export type {
  Role,
  User,
  Department,
  LoginResult,
} from '@/features/users/domain/user.types'

export {
  login,
  logout,
  getCurrentUser,
  changePassword,
} from '@/features/users/client/auth-api'

export {
  getCompanyLeaders,
  getUsersByDepartment,
  getDepartmentLeaders,
  getDepartmentManagers,
} from '@/features/users/client/user-api'

export {
  getDepartments,
  getDepartmentName,
  clearDepartmentsCache,
} from '@/features/departments/client/department-api'

export {
  getRoleName,
  isCompanyApprovalLeader,
  isPresident,
  isDepartmentApprover,
  isAdmin,
  isSupervisionAdmin,
  canImportExport,
  isCompanyLevel,
} from '@/features/users/domain/role.rules'
