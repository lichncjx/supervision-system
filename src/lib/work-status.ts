export const CURRENT_WORK_STATUS_VALUES = [
  'draft',
  'pending_dept',
  'pending_company',
  'approved',
  'in_progress',
  'pending_decompose',
  'pending_complete',
  'pending_evidence_dept',
  'pending_evidence_company',
  'pending_main_leader_cancel',
  'completed',
  'rejected',
  'adjusting',
  'cancelling',
  'cancelled',
] as const;

export type CurrentWorkStatusValue = (typeof CURRENT_WORK_STATUS_VALUES)[number];

export const LEGACY_WORK_STATUS_VALUES = [
  'pending_approval',
  'active',
  'decomposed',
] as const;

export type LegacyWorkStatusValue = (typeof LEGACY_WORK_STATUS_VALUES)[number];
export type WorkStatusValue = CurrentWorkStatusValue | LegacyWorkStatusValue;

export type WorkStatusVisualGroup =
  | 'approving'
  | 'handling'
  | 'inProgress'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface WorkStatusMeta {
  value: WorkStatusValue;
  prismaValue?: string;
  label: string;
  description: string;
  visualGroup: WorkStatusVisualGroup;
  badgeClass: string;
  isTerminal: boolean;
  isApproving: boolean;
  isHandling: boolean;
  isInProgress: boolean;
  countsForDeadline: boolean;
  isLegacy: boolean;
}

const baseBadgeClass = 'border';

export const WORK_STATUS_META = {
  draft: {
    value: 'draft',
    prismaValue: 'DRAFT',
    label: '草稿',
    description: '草稿，待提交',
    visualGroup: 'cancelled',
    badgeClass: `bg-slate-100 text-slate-700 ${baseBadgeClass} border-slate-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_dept: {
    value: 'pending_dept',
    prismaValue: 'PENDING_DEPT',
    label: '待部门审批',
    description: '待部门领导审批',
    visualGroup: 'approving',
    badgeClass: `bg-yellow-100 text-yellow-800 ${baseBadgeClass} border-yellow-200`,
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_company: {
    value: 'pending_company',
    prismaValue: 'PENDING_COMPANY',
    label: '待公司审批',
    description: '待公司主管领导审批',
    visualGroup: 'approving',
    badgeClass: `bg-orange-100 text-orange-800 ${baseBadgeClass} border-orange-200`,
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  approved: {
    value: 'approved',
    prismaValue: 'APPROVED',
    label: '已审批',
    description: '已立项，待上传见证材料',
    visualGroup: 'inProgress',
    badgeClass: `bg-blue-100 text-blue-800 ${baseBadgeClass} border-blue-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: true,
    countsForDeadline: true,
    isLegacy: false,
  },
  in_progress: {
    value: 'in_progress',
    prismaValue: 'IN_PROGRESS',
    label: '进行中',
    description: '进行中',
    visualGroup: 'inProgress',
    badgeClass: `bg-blue-100 text-blue-800 ${baseBadgeClass} border-blue-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: true,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_decompose: {
    value: 'pending_decompose',
    prismaValue: 'PENDING_DECOMPOSE',
    label: '待分解',
    description: '待分解',
    visualGroup: 'handling',
    badgeClass: `bg-amber-100 text-amber-800 ${baseBadgeClass} border-amber-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_complete: {
    value: 'pending_complete',
    prismaValue: 'PENDING_COMPLETE',
    label: '待完成',
    description: '完成申请待公司领导审批',
    visualGroup: 'approving',
    badgeClass: `bg-orange-100 text-orange-800 ${baseBadgeClass} border-orange-200`,
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_evidence_dept: {
    value: 'pending_evidence_dept',
    prismaValue: 'PENDING_EVIDENCE_DEPT',
    label: '待部门见证审批',
    description: '见证材料待部门领导审批',
    visualGroup: 'handling',
    badgeClass: `bg-indigo-100 text-indigo-800 ${baseBadgeClass} border-indigo-200`,
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_evidence_company: {
    value: 'pending_evidence_company',
    prismaValue: 'PENDING_EVIDENCE_COMPANY',
    label: '待公司见证审批',
    description: '见证材料待公司主管领导审批',
    visualGroup: 'handling',
    badgeClass: `bg-indigo-100 text-indigo-800 ${baseBadgeClass} border-indigo-200`,
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: true,
    isLegacy: false,
  },
  pending_main_leader_cancel: {
    value: 'pending_main_leader_cancel',
    prismaValue: 'PENDING_MAIN_LEADER_CANCEL',
    label: '待主要领导取消审批',
    description: '重点工作取消申请待公司主要领导审批',
    visualGroup: 'rejected',
    badgeClass: `bg-red-100 text-red-800 ${baseBadgeClass} border-red-200`,
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
    description: '已完成',
    visualGroup: 'completed',
    badgeClass: `bg-green-100 text-green-800 ${baseBadgeClass} border-green-200`,
    isTerminal: true,
    isApproving: false,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: false,
  },
  rejected: {
    value: 'rejected',
    prismaValue: 'REJECTED',
    label: '已退回',
    description: '已退回，待修改后重新提交',
    visualGroup: 'rejected',
    badgeClass: `bg-red-100 text-red-800 ${baseBadgeClass} border-red-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: true,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: false,
  },
  adjusting: {
    value: 'adjusting',
    prismaValue: 'ADJUSTING',
    label: '调整审批中',
    description: '调整审批中',
    visualGroup: 'handling',
    badgeClass: `bg-purple-100 text-purple-800 ${baseBadgeClass} border-purple-200`,
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: true,
    countsForDeadline: true,
    isLegacy: false,
  },
  cancelling: {
    value: 'cancelling',
    prismaValue: 'CANCELLING',
    label: '取消审批中',
    description: '取消审批中',
    visualGroup: 'cancelled',
    badgeClass: `bg-rose-100 text-rose-800 ${baseBadgeClass} border-rose-200`,
    isTerminal: false,
    isApproving: true,
    isHandling: false,
    isInProgress: true,
    countsForDeadline: true,
    isLegacy: false,
  },
  cancelled: {
    value: 'cancelled',
    prismaValue: 'CANCELLED',
    label: '已取消',
    description: '已取消',
    visualGroup: 'cancelled',
    badgeClass: `bg-slate-200 text-slate-700 ${baseBadgeClass} border-slate-300`,
    isTerminal: true,
    isApproving: false,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: false,
  },
} as const satisfies Record<CurrentWorkStatusValue, WorkStatusMeta>;

export const LEGACY_WORK_STATUS_META = {
  pending_approval: {
    value: 'pending_approval',
    label: '待审批',
    description: '历史兼容状态，仅用于展示',
    visualGroup: 'approving',
    badgeClass: `bg-yellow-100 text-yellow-800 ${baseBadgeClass} border-yellow-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: true,
  },
  active: {
    value: 'active',
    label: '进行中',
    description: '历史兼容状态，仅用于展示',
    visualGroup: 'inProgress',
    badgeClass: `bg-blue-100 text-blue-800 ${baseBadgeClass} border-blue-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: true,
  },
  decomposed: {
    value: 'decomposed',
    label: '已分解',
    description: '历史兼容状态，仅用于展示',
    visualGroup: 'handling',
    badgeClass: `bg-amber-100 text-amber-800 ${baseBadgeClass} border-amber-200`,
    isTerminal: false,
    isApproving: false,
    isHandling: false,
    isInProgress: false,
    countsForDeadline: false,
    isLegacy: true,
  },
} as const satisfies Record<LegacyWorkStatusValue, WorkStatusMeta>;

export const ALL_WORK_STATUS_META = {
  ...WORK_STATUS_META,
  ...LEGACY_WORK_STATUS_META,
} as const satisfies Record<WorkStatusValue, WorkStatusMeta>;

const PRISMA_WORK_STATUS_TO_VALUE = Object.fromEntries(
  CURRENT_WORK_STATUS_VALUES.map((status) => [WORK_STATUS_META[status].prismaValue, status])
) as Record<string, CurrentWorkStatusValue>;

export const PENDING_APPROVAL_FILTER_STATUS_VALUES = [
  'pending_dept',
  'pending_company',
  'pending_evidence_dept',
  'pending_evidence_company',
  'cancelling',
  'pending_main_leader_cancel',
] as const satisfies readonly CurrentWorkStatusValue[];

export function normalizeWorkStatus(status: unknown): WorkStatusValue | undefined {
  if (typeof status !== 'string') return undefined;

  const trimmed = status.trim();
  if (!trimmed) return undefined;

  const lower = trimmed.toLowerCase() as WorkStatusValue;
  if (lower in ALL_WORK_STATUS_META) {
    return lower;
  }

  return PRISMA_WORK_STATUS_TO_VALUE[trimmed.toUpperCase()];
}

export function getWorkStatusMeta(status: unknown): WorkStatusMeta | undefined {
  const normalized = normalizeWorkStatus(status);
  return normalized ? ALL_WORK_STATUS_META[normalized] : undefined;
}

export function getWorkStatusLabel(status: unknown): string {
  return getWorkStatusMeta(status)?.label || String(status);
}

export function getWorkStatusDescription(status: unknown): string {
  return getWorkStatusMeta(status)?.description || String(status);
}

export function getWorkStatusBadgeClass(status: unknown): string {
  return getWorkStatusMeta(status)?.badgeClass || WORK_STATUS_META.draft.badgeClass;
}

export function getWorkStatusVisualGroup(status: unknown): WorkStatusVisualGroup {
  return getWorkStatusMeta(status)?.visualGroup || WORK_STATUS_META.cancelled.visualGroup;
}

export function isCurrentWorkStatus(status: unknown): status is CurrentWorkStatusValue {
  const normalized = normalizeWorkStatus(status);
  return Boolean(normalized && !ALL_WORK_STATUS_META[normalized].isLegacy);
}

export function isLegacyWorkStatus(status: unknown): status is LegacyWorkStatusValue {
  return Boolean(getWorkStatusMeta(status)?.isLegacy);
}

export function isWorkStatusTerminal(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isTerminal);
}

export function isWorkStatusApproving(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isApproving);
}

export function isWorkStatusHandling(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isHandling);
}

export function isWorkStatusInProgress(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.isInProgress);
}

export function shouldCountWorkStatusForDeadline(status: unknown): boolean {
  return Boolean(getWorkStatusMeta(status)?.countsForDeadline);
}

export function isWorkStatusReturned(status: unknown): boolean {
  return normalizeWorkStatus(status) === 'rejected';
}

export function isWorkStatusInPendingApprovalFilter(status: unknown): boolean {
  const normalized = normalizeWorkStatus(status);
  return Boolean(
    normalized &&
    (PENDING_APPROVAL_FILTER_STATUS_VALUES as readonly WorkStatusValue[]).includes(normalized)
  );
}
