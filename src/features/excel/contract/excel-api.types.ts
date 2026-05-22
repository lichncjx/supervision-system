import type { ValidationError } from '@/features/excel/domain/excel-import.rules'

export interface ImportExcelSuccessResponse {
  success: true
  imported: number
  message: string
}

export interface ImportExcelValidationErrorResponse {
  success: false
  error: string
  details: ValidationError[]
}

export type ImportExcelResponse =
  | ImportExcelSuccessResponse
  | ImportExcelValidationErrorResponse
