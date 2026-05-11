export interface ExportWorksToExcelInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  type: string | null
  status: string | null
  departmentId: string | null
  keyword: string | null
}

export interface ExportCompletionRateInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  startDate: string | null
  endDate: string | null
}

export interface CompletionRateStat {
  departmentId?: number
  departmentName: string
  priorityTotal: number
  priorityCompleted: number
  priorityRate: number
  mainTotal: number
  mainCompleted: number
  mainRate: number
  todoTotal: number
  todoCompleted: number
  todoRate: number
  total: number
  completed: number
  cancelled: number
  overdue: number
  completionRate: number
}

export type ExportCompletionRateResult =
  | { kind: 'ok'; buffer: Buffer; fileName: string }
  | { kind: 'error'; status: number; message: string }

export interface ImportRow {
  row: number
  data: any
}

export interface ImportValidationError {
  row: number
  field: string
  value: string
  reason: string
}

export interface ImportWorksFromExcelInput {
  currentUser: {
    id: number
    name: string
    role: string
    departmentId: number
  }
  type: string
  fileBuffer: Buffer
  fileName: string
}

export type ImportWorksFromExcelResult =
  | {
      kind: 'success'
      imported: number
      message: string
    }
  | {
      kind: 'validation-error'
      error: string
      details: ImportValidationError[]
    }
  | { kind: 'error'; status: number; message: string }

export type ExportWorksToExcelResult =
  | {
      kind: 'ok'
      buffer: Buffer
      fileName: string
      visibleItemCount: number
    }
  | { kind: 'error'; status: number; message: string }
