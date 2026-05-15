import type {
  WorkType,
  ActionType,
  WorkNode,
  Cooperator,
  AdjustHistory,
  WorkStatusFilter,
} from '@/features/works/domain/work-client.types'
import type { WorkStatus } from '@/lib/work-status'
import type { Attachment } from '@/features/attachments/domain/attachment-client.types'

export type WorkFilter = WorkStatusFilter

export interface Work {
  id: number
  title: string
  description?: string
  type: WorkType

  // ---- 部门关联 ----
  // departmentId: 事项唯一主责部门
  departmentId?: number
  departmentName?: string
  // cooperators: 配合方列表 JSON，结构见 docs/design/责任事项方模型设计.md
  cooperators?: Cooperator[]

  // ---- 业务人员 ID 字段（xxxId = 真实关联字段，用于权限、流程、审批、待处理判断）----
  creatorRole: string
  creatorId?: number
  creatorName?: string
  // firstSubmitterId: 首次提交审批人，退回后处理权限判定依据
  // firstSubmitterId ?? creatorId 的 fallback 仅用于兼容历史数据
  firstSubmitterId?: number
  // proposedLeaderId: 待办事项的提出领导用户 ID（公司领导）
  proposedLeaderId?: number
  // approvalLeaderId: 待办事项的审批领导用户 ID，默认应等于 proposedLeaderId
  approvalLeaderId?: number
  // currentApproverId / currentApproverRole: 当前应执行审批操作的用户/角色
  currentApproverId?: number
  currentApproverRole?: string

  // ---- 业务人员姓名快照字段（仅用于页面展示、Excel 导出、历史留痕，不参与权限判断）----
  // proposedLeader: 提出领导姓名（从 Prisma relation 解析，非独立 DB 字段）
  proposedLeader?: string
  proposedLeaderRole?: string
  // approvalLeader: 审批领导姓名（从 Prisma relation 解析，非独立 DB 字段）
  approvalLeader?: string
  approvalLeaderRole?: string
  // responsibleLeader: 主责责任领导姓名文本，仅用于展示、导入导出、历史留痕，不参与权限判断
  responsibleLeader?: string
  // responsiblePerson: 主责责任人姓名文本，仅用于展示、导入导出、历史留痕，不参与权限判断
  responsiblePerson?: string

  // ---- 事项基本信息 ----
  status: WorkStatus
  action: ActionType
  needCeo: boolean
  isInnovation?: boolean
  nodes?: WorkNode[]
  businessCategory?: string
  workItem?: string
  workNode?: string
  // Reserved for future actual completion time; plan deadlines use planCompleteTime.
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
  rejectReason?: string | null
  rejectedAt?: string
  rejectedFrom?: WorkStatus
  rejectedFromStatus?: WorkStatus | null
  rejectedBy?: string
  adjustHistory?: AdjustHistory[]
  pendingAdjustment?: WorkEditablePatch
  pendingAdjustmentReason?: string
  pendingAdjustmentFromTime?: string
  pendingAdjustmentToTime?: string
  attachments?: Attachment[]

  // ---- 时间戳 ----
  createdAt: string
  updatedAt: string
}

export type WorkEditablePatch = Partial<
  Pick<
    Work,
    | 'title'
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
    | 'proposedLeader'
    | 'proposedLeaderId'
    | 'proposedLeaderRole'
    | 'proposedScene'
    | 'formedTime'
    | 'responsiblePerson'
    | 'workPlan'
    | 'planCompleteTime'
    | 'progress'
    | 'approvalLeader'
    | 'approvalLeaderId'
    | 'approvalLeaderRole'
  >
>
