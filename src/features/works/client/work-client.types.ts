import type { WorkStatus } from '@/features/works/domain/work-status'
import type { AttachmentDto as Attachment } from '@/features/attachments/application/attachment.dto'

export type WorkType = '重点' | '主要' | '待办'

export type WorkStatusFilter =
  | 'all'
  | 'draft'
  | 'returnedDraft'
  | 'pendingDecompose'
  | 'approving'
  | 'handling'
  | 'inProgress'
  | 'completed'
  | 'cancelled'
  | 'overdue'
  | 'expiring'

export interface WorkQuery {
  type?: WorkType | '全部'
  departmentId?: number | '全部'
  status?: WorkStatusFilter
  keyword?: string
  assessmentYear?: number | null
  workItem?: string
}

export type ActionType = 'create' | 'complete' | 'adjust' | 'cancel' | 'todo_decompose'

export interface WorkSubNode {
  id: number
  title: string
  completeTime?: string
}

export interface WorkNode {
  id: number
  title: string
  completeTime?: string
  children: WorkSubNode[]
}

export interface AdjustHistory {
  id: number
  reason: string
  field: 'planCompleteTime'
  fromTime?: string
  toTime?: string
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
}

export interface Cooperator {
  departmentId: number
  departmentName?: string
  leaderMemberId?: number
  leader?: string
  personMemberId?: number
  person?: string
}

export interface Work {
  id: number
  title: string
  description?: string
  type: WorkType

  // ---- 部门关联 ----
  departmentId?: number
  departmentName?: string
  cooperators?: Cooperator[]

  // ---- 业务人员 ID 字段 ----
  creatorRole: string
  creatorId: number
  creatorName?: string
  firstSubmitterId?: number
  firstSubmitterName?: string
  proposedLeaderId?: number
  approvalLeaderId?: number
  currentApproverId?: number
  currentApproverRole?: string

  // ---- 业务人员姓名快照字段（仅展示用）----
  proposedLeader?: string
  proposedLeaderRole?: string
  approvalLeader?: string
  approvalLeaderRole?: string
  responsibleLeader?: string
  responsiblePerson?: string
  responsibleLeaderUserId?: number | null
  responsiblePersonUserId?: number | null

  // ---- 事项基本信息 ----
  status: WorkStatus
  action: ActionType
  needCeo: boolean
  isInnovation?: boolean
  nodes?: WorkNode[]
  assessmentYear?: number
  businessCategory?: string
  workItem?: string
  workNode?: string
  completeTime?: string
  completeForm?: string
  proposedScene?: string
  formedTime?: string
  workPlan?: string
  planCompleteTime?: string
  progress?: string

  // ---- 证明材料 / 调整 / 取消 / 退回 / 附件 ----
  proof?: string
  adjustReason?: string
  cancelReason?: string
  adjustNewTime?: string
  adjustTimeType?: 'planCompleteTime'
  rejectReason?: string
  approvalType?: string
  rejectedFrom?: WorkStatus
  rejectedFromStatus?: WorkStatus
  rejectedBy?: string
  adjustHistory?: AdjustHistory[]
  pendingAdjustment?: WorkEditablePatch
  pendingAdjustmentReason?: string
  pendingAdjustmentBeforeSnapshot?: WorkEditablePatch
  pendingAdjustmentFromTime?: string
  pendingAdjustmentToTime?: string
  attachments?: Attachment[]

  // ---- 时间戳 ----
  createdAt: string
  updatedAt: string
}

type WorkEditablePatchBase = Pick<
  Work,
  | 'assessmentYear'
  | 'description'
  | 'businessCategory'
  | 'workItem'
  | 'workNode'
  | 'nodes'
  | 'isInnovation'
  | 'completeForm'
  | 'departmentId'
  | 'cooperators'
  | 'responsibleLeader'
  | 'responsibleLeaderUserId'
  | 'proposedLeader'
  | 'proposedLeaderId'
  | 'proposedLeaderRole'
  | 'proposedScene'
  | 'formedTime'
  | 'responsiblePerson'
  | 'responsiblePersonUserId'
  | 'workPlan'
  | 'planCompleteTime'
  | 'progress'
  | 'approvalLeader'
  | 'approvalLeaderId'
  | 'approvalLeaderRole'
>

type NullableWorkTextField =
  | 'description'
  | 'businessCategory'
  | 'workItem'
  | 'workNode'
  | 'completeForm'
  | 'responsibleLeader'
  | 'proposedLeader'
  | 'proposedLeaderRole'
  | 'proposedScene'
  | 'formedTime'
  | 'responsiblePerson'
  | 'workPlan'
  | 'planCompleteTime'
  | 'progress'
  | 'approvalLeader'
  | 'approvalLeaderRole'

type NullableWorkNumberField =
  | 'departmentId'
  | 'responsibleLeaderUserId'
  | 'responsiblePersonUserId'
  | 'proposedLeaderId'
  | 'approvalLeaderId'

export type WorkEditablePatch = Partial<
  Omit<WorkEditablePatchBase, NullableWorkTextField | NullableWorkNumberField>
> &
  Partial<Record<NullableWorkTextField, string | null>> &
  Partial<Record<NullableWorkNumberField, number | null>>
