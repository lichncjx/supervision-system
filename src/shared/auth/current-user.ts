export interface BaseCurrentUser {
  id: number
  role: string
  departmentId: number
}

export interface CurrentUser extends BaseCurrentUser {
  name: string
}
