import { isReturnedDraftWork } from '@/lib/work-status'
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

  let currentIndex = 0

  if (work.status === 'pending_decompose') currentIndex = 1
  else if (
    work.status === 'proposing' ||
    work.status === 'cancelling' ||
    work.status === 'adjusting'
  )
    currentIndex = 2
  else if (work.status === 'in_progress') currentIndex = 3
  else if (work.status === 'completing') currentIndex = 4
  else if (work.status === 'completed')
    currentIndex = labels.length - 1
  else if (isReturnedDraftWork(work))
    currentIndex = Math.max(0, labels.length - 2)
  else if (work.status === 'cancelled')
    currentIndex = labels.length - 1

  return labels.map((label, index) => {
    if (isReturnedDraftWork(work) && index === currentIndex) {
      return { label: `${label}（退回待处理）`, status: 'returned' as const }
    }
    if (index < currentIndex) return { label, status: 'done' as const }
    if (index === currentIndex) return { label, status: 'current' as const }
    return { label, status: 'pending' as const }
  })
}
