export type ExcelRouteType = 'priority' | 'main' | 'todo'

export { getDepartmentsForExcel, getCompanyLeadersForExcel, getDepartmentNameForExcel } from '@/features/excel/client/excel-api'
export { exportWorksToExcel } from '@/features/excel/client/excel-export-client'
export { importWorksFromExcel } from '@/features/excel/client/excel-import-client'
export { exportCompanyCompletionRate } from '@/features/excel/client/completion-rate-client'
export { getExcelTemplate } from '@/features/excel/infrastructure/excel-template-generator'
