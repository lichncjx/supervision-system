import { isReturnedDraftWork } from '@/features/works/domain/work-status.rules'
import type { Work } from '@/features/works/client/work-view.types'
import type { WorkflowStep } from '@/features/workflow/domain/workflow-client.types'

export function getWorkflowRecordDescription(
  action: string,
  previousStatus: string,
  newStatus: string,
): string {
  const na = action.toLowerCase()
  const nsOld = previousStatus.toLowerCase()
  const nsNew = newStatus.toLowerCase()

  if (na === 'reject') return '审批退回，待修改后重新提交'
  if (na === 'adjust') return '提交调整申请，进入调整审批流程'
  if (na === 'cancel') return '提交取消申请，进入取消审批流程'
  if (na === 'evidence') {
    if (nsNew === 'completing') return '提交完成申请，进入完成审批流程'
    return '提交见证材料'
  }
  if (na === 'submit') return '提交审批申请'
  if (na === 'approve') {
    if (nsOld === 'adjusting') {
      if (nsNew === 'adjusting')
        return '调整申请审批通过，继续流转至下一审批节点'
      if (nsNew === 'in_progress')
        return '调整申请审批通过，事项恢复进行中'
    }
    if (nsOld === 'cancelling') {
      if (nsNew === 'cancelling')
        return '取消申请审批通过，继续流转至下一审批节点'
      if (nsNew === 'cancelled')
        return '取消申请审批通过，事项已取消'
    }
    if (nsOld === nsNew) return '审批通过，流程继续流转'

    const statusChangeDesc: Record<string, Record<string, string>> = {
      draft: { proposing: '提交审批，进入立项审批中' },
      pending_decompose: { proposing: '分解方案提交审批' },
      proposing: { in_progress: '公司领导审批通过，事项进入进行中' },
      in_progress: { completing: '提交完成申请' },
      completing: { completed: '完成审批通过，事项已完成' },
    }
    if (statusChangeDesc[nsOld]?.[nsNew]) return statusChangeDesc[nsOld][nsNew]
    return '审批通过，状态变更'
  }
  if (na === 'decompose') return '待办事项已分解'
  return ''
}

function statusToStepIndex(status: string): number | undefined {
  if (status === 'pending_decompose') return 1
  if (status === 'proposing') return 2
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
  if (role === 'VICE_PRESIDENT' || role === 'PRESIDENT') {
    return work.type === '待办' ? '提出领导审批' : '公司主管领导审批'
  }
  return ''
}

export function getWorkflowSteps(work: Work): WorkflowStep[] {
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
    currentIndex = statusToStepIndex(work.status as string) ?? 0
  }

  return labels.map((label, index) => {
    let displayLabel = label

    // adjusting / cancelling override the "进行中" step label with parenthetical detail
    if (!isReturned && index === currentIndex && index === statusToStepIndex('in_progress')) {
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
