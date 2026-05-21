export interface DepartmentApiDto {
  id: number
  name: string
  code: string
  isBusiness: boolean
}

export type DepartmentListResponse = DepartmentApiDto[]

export interface DepartmentApiErrorDto {
  error?: string
}
