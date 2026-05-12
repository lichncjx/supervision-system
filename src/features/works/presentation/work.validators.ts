import { WorkItemStatus, WorkItemType } from '@prisma/client'
import type { StatusFilter } from './work.dto'

const APPROVING_STATUSES = [
  WorkItemStatus.PROPOSING,
  WorkItemStatus.ADJUSTING,
  WorkItemStatus.CANCELLING,
  WorkItemStatus.COMPLETING,
]

const TERMINAL_STATUSES: WorkItemStatus[] = [
  WorkItemStatus.COMPLETED,
  WorkItemStatus.CANCELLED,
]

function normalizeStatusQuery(status: string | null): StatusFilter {
  if (!status) return null as unknown as StatusFilter

  const normalized = status.trim()
  const lower = normalized.toLowerCase()
  if (!normalized) return null as unknown as StatusFilter

  if (lower === 'draft') {
    return {
      kind: 'where',
      where: {
        status: WorkItemStatus.DRAFT,
        rejectReason: null,
        rejectedFromStatus: null,
      },
    }
  }

  if (lower === 'returneddraft' || lower === 'returned_draft') {
    return {
      kind: 'where',
      where: {
        status: WorkItemStatus.DRAFT,
        OR: [
          { rejectReason: { not: null } },
          { rejectedFromStatus: { not: null } },
        ],
      },
    }
  }

  if (lower === 'pendingdecompose' || lower === 'pending_decompose') {
    return {
      kind: 'where',
      where: { status: WorkItemStatus.PENDING_DECOMPOSE },
    }
  }

  const exact = Object.values(WorkItemStatus).find(
    (value) => value === normalized.toUpperCase(),
  )
  if (exact) return { kind: 'where', where: { status: exact } }

  if (lower === 'approving') {
    return {
      kind: 'where',
      where: { status: { in: APPROVING_STATUSES } },
    }
  }

  if (lower === 'inprogress' || lower === 'in_progress') {
    return {
      kind: 'where',
      where: { status: WorkItemStatus.IN_PROGRESS },
    }
  }

  if (lower === 'completed') {
    return {
      kind: 'where',
      where: { status: WorkItemStatus.COMPLETED },
    }
  }

  if (lower === 'cancelled') {
    return {
      kind: 'where',
      where: { status: WorkItemStatus.CANCELLED },
    }
  }

  if (lower === 'handling') {
    return {
      kind: 'post',
      where: {
        status: {
          in: [
            WorkItemStatus.DRAFT,
            WorkItemStatus.PENDING_DECOMPOSE,
            WorkItemStatus.IN_PROGRESS,
          ],
        },
      },
      postFilter: 'handling',
    }
  }

  if (lower === 'overdue' || lower === 'expiring') {
    return {
      kind: 'post',
      where: { status: { notIn: TERMINAL_STATUSES } },
      postFilter: lower as 'overdue' | 'expiring',
    }
  }

  return { kind: 'invalid' }
}

export function parseWorkQuery(searchParams: URLSearchParams) {
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const departmentId = searchParams.get('departmentId')
  const keyword = searchParams.get('keyword')

  return { type, status, departmentId, keyword }
}

export function parseWorkType(raw: string | null): WorkItemType | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower === 'priority') return WorkItemType.PRIORITY
  if (lower === 'main') return WorkItemType.MAIN
  if (lower === 'todo') return WorkItemType.TODO
  return null
}

export function parseWorkStatusFilter(raw: string | null): StatusFilter {
  if (!raw) return null as unknown as StatusFilter
  return normalizeStatusQuery(raw)
}
