import { isReturnedDraftWork } from '@/features/works/domain/work-status.rules'
import type { Work } from '@/features/works/client/work-client.types'
import { isCompanyLevel } from '@/features/users/domain/role.rules'

function statusToStepIndex(work: Work): number | undefined {
  const status = work.status as string
  if (status === 'pending_decompose') return 1
  if (status === 'proposing') {
    return work.currentApproverRole === 'DEPARTMENT_LEADER' ? 1 : 2
  }
  if (status === 'in_progress' || status === 'adjusting' || status === 'cancelling') return 3
  if (status === 'completing') return 4
  if (status === 'completed' || status === 'cancelled') return undefined
  return undefined
}

/** Which step in the chain a returned-draft item should show the "退回待处理" marker on. */
function returnedDraftStepIndex(work: Work): number {
  if (work.type === '待办') {
    const companyCreated =
      work.creatorRole === 'VICE_PRESIDENT' ||
      work.creatorRole === 'PRESIDENT'
    // company-created TODO: return marker goes on "部门分解" (index 1)
    // department-created TODO: return marker goes on "部门发起并分解" (index 0)
    return companyCreated ? 1 : 0
  }
  // non-TODO: return marker goes on "部门提交" (index 0)
  return 0
}

function approverRoleLabel(
  work: Work,
): string {
  const role = work.currentApproverRole
  if (role === 'DEPARTMENT_LEADER') return '部门领导审批'
  if (isCompanyLevel(role)) {
    return work.type === '待办' ? '提出领导审批' : '公司主管领导审批'
  }
  return ''
}

type StepStatus = 'done' | 'current' | 'pending' | 'returned'

export function getWorkflowSteps(work: Work): Array<{ label: string; status: StepStatus }> {
  let labels: string[] = []

  if (work.type === '待办') {
    const companyCreated =
      work.creatorRole === 'VICE_PRESIDENT' ||
      work.creatorRole === 'PRESIDENT'
    labels = companyCreated
      ? ['公司领导提出', '部门分解', '提出领导审批', '进行中', '完成审批', '已完成']
      : ['部门发起并分解', '部门领导审批', '提出领导审批', '进行中', '完成审批', '已完成']
  } else {
    labels = ['部门提交', '部门领导审批', '公司主管领导审批', '进行中', '完成审批', '已完成']
  }

  const isReturned = isReturnedDraftWork(work)

  let currentIndex: number
  if (isReturned) {
    currentIndex = returnedDraftStepIndex(work)
  } else if (work.status === 'completed' || work.status === 'cancelled') {
    currentIndex = labels.length - 1
  } else {
    currentIndex = statusToStepIndex(work) ?? 0
  }

  return labels.map((label, index) => {
    let displayLabel = label

    // adjusting / cancelling override the "进行中" step label with parenthetical detail
    if (!isReturned && index === currentIndex && index === 3) {
      const roleLabel = approverRoleLabel(work)
      if (work.status === 'adjusting') {
        displayLabel = roleLabel ? `进行中（调整中：${roleLabel}）` : '进行中（调整中）'
      } else if (work.status === 'cancelling') {
        displayLabel = roleLabel ? `进行中（取消中：${roleLabel}）` : '进行中（取消中）'
      }
    }

    if (isReturned && index === currentIndex) {
      return { label: `${displayLabel}（退回待处理）`, status: 'returned' as const }
    }
    if (index < currentIndex) return { label: displayLabel, status: 'done' as const }
    if (index === currentIndex) return { label: displayLabel, status: 'current' as const }
    return { label: displayLabel, status: 'pending' as const }
  })
}
