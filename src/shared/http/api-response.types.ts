export interface ApiErrorResponse<Code extends string = string> {
  error: string
  code?: Code
  details?: unknown
}

export interface ActionSuccessResponse {
  success: true
}

export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
