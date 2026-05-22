export interface OperationLogApiDto {
  id: number
  userId: number
  userName: string
  userRole: string
  action: string
  actionText: string
  module: string
  moduleText: string
  targetId: number | null
  targetType: string | null
  description: string
  ipAddress: string | null
  createdAt: string
}

export interface OperationLogListResponse {
  items: OperationLogApiDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
