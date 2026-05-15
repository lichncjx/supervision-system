export const CURRENT_WORK_STATUS_VALUES = [
  'draft',
  'pending_decompose',
  'proposing',
  'in_progress',
  'adjusting',
  'cancelling',
  'completing',
  'completed',
  'cancelled',
] as const

export type WorkStatus = (typeof CURRENT_WORK_STATUS_VALUES)[number]

export type WorkStatusVisualGroup =
  | 'approving'
  | 'handling'
  | 'inProgress'
  | 'completed'
  | 'cancelled'

export interface WorkStatusMeta {
  value: WorkStatus
  prismaValue: string
  label: string
  description: string
  visualGroup: WorkStatusVisualGroup
  badgeClass: string
  leftBorderClass: string
  isTerminal: boolean
  isApproving: boolean
  isHandling: boolean
  isInProgress: boolean
  countsForDeadline: boolean
  isLegacy: false
}

const baseBadgeClass = 'border'

export const WORK_STATUS_META = {
  draft: {
    value: 'draft',
    prismaValue: 'DRAFT',
    label: '草稿',
    description: '草稿，待提交或待修改',
    visualGroup: 'handling',
    badgeClass: `bg-slate-100 text-slate-700 ${baseBadgeClass} border-slate-200`,
    leftBorderClass: 'border-l-2 border-l-slate-400 bg-slate-50/30',
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_decompose: {
    value: 'pending_decompose',
    prismaValue: 'PENDING_DECOMPOSE',
    label: '待分解',
    description: '公司领导发起的待办事项，待责任部门分解',
    visualGroup: 'handling',
    badgeClass: `bg-amber-100 text-amber-800 ${baseBadgeClass} border-amber-200`,
    leftBorderClass: 'border-l-2 border-l-amber-400 bg-amber-50/20',
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  proposing: {
    value: 'proposing',
    prismaValue: 'PROPOSING',
    label: '立项审批中',
    description: '立项或分解方案审批中',
    visualGroup: 'approving',
    badgeClass: `bg-yellow-100 text-yellow-800 ${baseBadgeClass} border-yellow-200`,
    leftBorderClass: 'border-l-2 border-l-yellow-400 bg-yellow-50/20',
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  in_progress: {
    value: 'in_progress',
    prismaValue: 'IN_PROGRESS',
    label: '进行中',
    description: '事项已进入执行阶段',
    visualGroup: 'inProgress',
    badgeClass: `bg-blue-100 text-blue-800 ${baseBadgeClass} border-blue-200`,
    leftBorderClass: 'border-l-2 border-l-blue-400 bg-blue-50/20',
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: true,
    countsForDeadline: true,
    isLegacy: false,
  },
  adjusting: {
    value: 'adjusting',
    prismaValue: 'ADJUSTING',
    label: '调整审批中',
    description: '调整申请审批中',
    visualGroup: 'approving',
    badgeClass: `bg-purple-100 text-purple-800 ${baseBadgeClass} border-purple-200`,
    leftBorderClass: 'border-l-2 border-l-purple-400 bg-purple-50/30',
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  cancelling: {
    value: 'cancelling',
    prismaValue: 'CANCELLING',
    label: '取消审批中',
    description: '取消申请审批中',
    visualGroup: 'approving',
    badgeClass: `bg-rose-100 text-rose-800 ${baseBadgeClass} border-rose-200`,
    leftBorderClass: 'border-l-2 border-l-rose-400 bg-rose-50/30',
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  completing: {
    value: 'completing',
    prismaValue: 'COMPLETING',
    label: '完成审批中',
    description: '完成申请或完成材料审批中',
    visualGroup: 'approving',
    badgeClass: `bg-indigo-100 text-indigo-800 ${baseBadgeClass} border-indigo-200`,
    leftBorderClass: 'border-l-2 border-l-indigo-400 bg-indigo-50/20',
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  completed: {
    value: 'completed',
    prismaValue: 'COMPLETED',
    label: '已完成',
    description: '事项已完成',
    visualGroup: 'completed',
    badgeClass: `bg-green-100 text-green-800 ${baseBadgeClass} border-green-200`,
    leftBorderClass: 'border-l-2 border-l-emerald-400 bg-emerald-50/20',
    isTerminal: true,
    isApproving: false,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: false,
  },
  cancelled: {
    value: 'cancelled',
    prismaValue: 'CANCELLED',
    label: '已取消',
    description: '事项已取消',
    visualGroup: 'cancelled',
    badgeClass: `bg-slate-200 text-slate-700 ${baseBadgeClass} border-slate-300`,
    leftBorderClass: 'border-l-2 border-l-slate-400 bg-slate-50/30',
    isTerminal: true,
    isApproving: false,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: false,
  },
} as const satisfies Record<WorkStatus, WorkStatusMeta>


export const PRISMA_WORK_STATUS_TO_VALUE = Object.fromEntries(
  CURRENT_WORK_STATUS_VALUES.map((status) => [
    WORK_STATUS_META[status].prismaValue,
    status,
  ]),
) as Record<string, WorkStatus>

export const PENDING_APPROVAL_FILTER_STATUS_VALUES = [
  'proposing',
  'adjusting',
  'cancelling',
  'completing',
] as const satisfies readonly WorkStatus[]
