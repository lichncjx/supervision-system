'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSearchAndPagination } from '@/features/works/client/use-search-pagination'
import Link from 'next/link'
import { getWorkTypeAccent, getWorkTypeText } from '@/features/works/ui/status-colors'
import { ClipboardCheck, CheckCircle, XCircle, Play } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { getDepartments } from '@/features/departments/client/department-api'
import { getCompanyLeaders } from '@/features/users/client/user-api'
import { canApproveWork, canHandleWork } from '@/features/works/client/work-client-permissions'
import { getWorkDueDate } from '@/features/works/client/work-date.utils'
import { queryWorks } from '@/features/works/client/work-api'
import {
  approveWork,
  executeBatchWorkflow,
  previewBatchWorkflow,
  rejectWork,
} from '@/features/workflow/client/workflow-api'
import type { Work } from '@/features/works/client/work-client.types'
import { StatusBadge } from '@/features/works/ui/badges'
import { WorkTitle } from '@/features/works/ui/work-title'
import { WorkListPagination } from '@/features/works/ui/work-list-pagination'
import { WorkSearchBar } from '@/features/works/ui/work-search-bar'
import { ApproveDialog } from '@/features/workflow/ui/approve-dialog'
import type { User } from '@/features/users/client/user-client.types'
import type { Department } from '@/features/departments/client/department-api'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

function getStructuredGroupKey(work: Work) {
  if ((work.type !== '重点' && work.type !== '主要') || !work.workItem) return null
  return `${work.assessmentYear ?? '未设置年度'}\u0000${work.type}\u0000${work.workItem}`
}

function getBatchApprovalRouteKey(work: Work) {
  if (work.currentApproverRole === 'DEPARTMENT_LEADER') {
    return `next:${work.proposedLeaderId ?? work.approvalLeaderId ?? '待指定公司领导'}`
  }
  return 'complete'
}

export default function ApprovalPage() {
  const { user } = useAuth()
  const [approvingWorks, setApprovingWorks] = useState<Work[]>([])
  const [handlingWorks, setHandlingWorks] = useState<Work[]>([])
  const [tab, setTab] = useState<'approving' | 'handling' | 'all'>('approving')
  const [keyword, setKeyword] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [companyLeaders, setCompanyLeaders] = useState<User[]>([])
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [selectedWork, setSelectedWork] = useState<Work | null>(null)
  const [selectedBatchWorkIds, setSelectedBatchWorkIds] = useState<Set<number>>(new Set())
  const [batchApproveDialogOpen, setBatchApproveDialogOpen] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      const [depts, leaders] = await Promise.all([getDepartments(), getCompanyLeaders()])
      setDepartments(depts)
      setCompanyLeaders(leaders)
    }
    loadData()
  }, [])

  const load = async () => {
    const [approving, handling] = await Promise.all([
      queryWorks(user, { status: 'approving' } as any),
      queryWorks(user, { status: 'handling' } as any),
    ])
    setApprovingWorks(approving)
    setHandlingWorks(handling)
    setSelectedBatchWorkIds(new Set())
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const approvingCount = approvingWorks.length
  const handlingCount = handlingWorks.length

  const allWorks = useMemo(() => {
    const seen = new Set<number>()
    const merged: Work[] = []
    for (const w of [...approvingWorks, ...handlingWorks]) {
      if (!seen.has(w.id)) {
        seen.add(w.id)
        merged.push(w)
      }
    }
    return merged
  }, [approvingWorks, handlingWorks])

  const baseList = useMemo(() => {
    const source =
      tab === 'approving' ? approvingWorks : tab === 'handling' ? handlingWorks : allWorks
    if (tab !== 'approving') return source

    return [...source].sort((left, right) => {
      const leftGroup = getStructuredGroupKey(left)
      const rightGroup = getStructuredGroupKey(right)
      if (leftGroup && rightGroup) {
        const groupComparison = leftGroup.localeCompare(rightGroup, 'zh-CN')
        if (groupComparison !== 0) return groupComparison
        return (left.workNode || left.title).localeCompare(right.workNode || right.title, 'zh-CN')
      }
      if (leftGroup) return -1
      if (rightGroup) return 1
      return 0
    })
  }, [allWorks, approvingWorks, handlingWorks, tab])

  const { list, total, totalPages, page, setPage, pageSize, setPageSize } = useSearchAndPagination(
    baseList,
    keyword,
    [tab, keyword],
  )

  if (!user) return null

  const handleApproveClick = (work: Work) => {
    setSelectedWork(work)
    setApproveDialogOpen(true)
  }

  const handleApproveConfirm = async (comment?: string, nextApproverId?: number | null) => {
    if (!user || !selectedWork) return
    try {
      await approveWork(selectedWork, comment, nextApproverId)
      await load()
      alert('审批已通过')
    } catch (error) {
      console.error(error)
      alert('审批失败，请查看控制台错误')
    }
  }

  const handleReject = async (work: Work) => {
    const reason = prompt('请输入退回原因：')
    if (reason === null) return

    try {
      await rejectWork(work, reason || '审批退回')
      await load()
      alert('已退回')
    } catch (error) {
      console.error(error)
      alert('退回失败，请查看控制台错误')
    }
  }

  const isBatchApprovable = (work: Work) =>
    Number.isInteger(work.assessmentYear) &&
    Boolean(getStructuredGroupKey(work)) &&
    work.status === 'proposing' &&
    work.approvalType?.toUpperCase() === 'PROPOSE' &&
    canApproveWork(user, work)

  const selectedBatchWorks = approvingWorks.filter((work) => selectedBatchWorkIds.has(work.id))
  const selectedBatchApprovableWorks = selectedBatchWorks.filter(isBatchApprovable)
  const hasOnlyBatchApprovableWorks =
    selectedBatchWorks.length === selectedBatchApprovableWorks.length
  const firstSelectedBatchWork = selectedBatchApprovableWorks[0]
  const hasSameBatchGroup =
    selectedBatchApprovableWorks.length >= 2 &&
    !!firstSelectedBatchWork &&
    selectedBatchApprovableWorks.every(
      (work) => getStructuredGroupKey(work) === getStructuredGroupKey(firstSelectedBatchWork),
    )
  const hasSameBatchApprovalRoute =
    selectedBatchApprovableWorks.length >= 2 &&
    !!firstSelectedBatchWork &&
    selectedBatchApprovableWorks.every(
      (work) => getBatchApprovalRouteKey(work) === getBatchApprovalRouteKey(firstSelectedBatchWork),
    )
  const canBatchApprove =
    selectedBatchApprovableWorks.length >= 2 &&
    hasOnlyBatchApprovableWorks &&
    hasSameBatchGroup &&
    hasSameBatchApprovalRoute
  const batchApproveHint = !hasOnlyBatchApprovableWorks
    ? '仅可批量通过当前用户有审批权、处于立项审批中的重点/主要工作节点。'
    : !hasSameBatchGroup
      ? '批量通过仅支持同一年度、同一类型、同一工作事项下的工作节点。'
      : !hasSameBatchApprovalRoute
        ? '所选工作节点的审批后去向不同，请按审批路由分别选择。'
        : '所选工作节点可批量通过，提交前仍会再次校验审批状态、权限和路由。'
  const batchNeedsLeaderSelection =
    user?.role === 'DEPARTMENT_LEADER' &&
    selectedBatchWorks.length > 0 &&
    selectedBatchWorks.every((work) => !work.proposedLeaderId && !work.approvalLeaderId)

  const getGroupWorks = (work: Work) => {
    const groupKey = getStructuredGroupKey(work)
    if (!groupKey) return []
    return approvingWorks.filter(
      (item) => getStructuredGroupKey(item) === groupKey && isBatchApprovable(item),
    )
  }

  const toggleBatchWork = (workId: number, checked: boolean) => {
    setSelectedBatchWorkIds((current) => {
      const next = new Set(current)
      if (checked) next.add(workId)
      else next.delete(workId)
      return next
    })
  }

  const toggleGroupWorks = (works: Work[]) => {
    setSelectedBatchWorkIds((current) => {
      const next = new Set(current)
      const allSelected = works.length > 0 && works.every((work) => next.has(work.id))
      for (const work of works) {
        if (allSelected) next.delete(work.id)
        else next.add(work.id)
      }
      return next
    })
  }

  const executeBatchApprove = async (comment?: string, nextApproverId?: number | null) => {
    if (!canBatchApprove) return
    const payload = {
      action: 'approve' as const,
      items: selectedBatchWorks.map((work) => ({ id: work.id, updatedAt: work.updatedAt })),
      ...(comment ? { comment } : {}),
      ...(nextApproverId ? { nextApproverId } : {}),
    }
    try {
      await previewBatchWorkflow(payload)
      await executeBatchWorkflow(payload)
      await load()
      alert('批量审批已通过')
    } catch (error) {
      alert(error instanceof Error ? error.message : '批量审批失败，请刷新后重试')
    }
  }

  const handleBatchApproveClick = () => {
    if (!canBatchApprove) {
      alert(batchApproveHint)
      return
    }
    if (batchNeedsLeaderSelection) {
      setBatchApproveDialogOpen(true)
      return
    }
    void executeBatchApprove()
  }

  const getRouteType = (work: Work) => {
    if (work.type === '重点') return 'priority'
    if (work.type === '主要') return 'main'
    return 'todo'
  }

  return (
    <div className="space-y-6">
      <h1 className="stagger-1 flex items-center gap-3 text-2xl font-bold text-slate-800">
        <span className="w-1 h-6 rounded-full bg-purple-500" />
        <ClipboardCheck className="h-6 w-6 text-purple-500" />
        待我处理
      </h1>

      <div className="stagger-2 flex rounded-full bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('approving')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'approving'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          待我审批（{approvingCount}）
        </button>
        <button
          onClick={() => setTab('handling')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'handling'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          待我办理（{handlingCount}）
        </button>
        <button
          onClick={() => setTab('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          全部事项
        </button>
      </div>

      <WorkSearchBar
        keyword={keyword}
        onKeywordChange={setKeyword}
        total={total}
        page={page}
        totalPages={totalPages}
      />

      {tab === 'approving' && selectedBatchWorks.length >= 2 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span>{batchApproveHint}</span>
          <Button
            type="button"
            onClick={handleBatchApproveClick}
            disabled={!canBatchApprove}
            variant="outline"
            size="sm"
            className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
          >
            批量通过（{selectedBatchWorks.length}）
          </Button>
        </div>
      )}

      <div className="stagger-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        {list.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">暂无数据</div>
        ) : (
          <>
            <div>
              {list.map((work, index) => {
                const borderClass = getWorkTypeAccent(work.type)
                const groupKey = getStructuredGroupKey(work)
                const previousGroupKey = index > 0 ? getStructuredGroupKey(list[index - 1]) : null
                const isFirstInGroup =
                  tab === 'approving' && Boolean(groupKey) && groupKey !== previousGroupKey
                const groupWorks = tab === 'approving' ? getGroupWorks(work) : []
                const canBatchApproveInGroup = groupWorks.length >= 2
                const adjustmentReason = work.pendingAdjustmentReason || work.adjustReason

                return (
                  <React.Fragment key={work.id}>
                    {isFirstInGroup && canBatchApproveInGroup && (
                      <div className="flex items-center justify-between border-y border-sky-100 bg-sky-50/70 px-4 py-2 text-xs text-sky-800">
                        <span>
                          {work.assessmentYear} 年 · {work.type}工作 · 工作事项：{work.workItem}
                          （当前可批量审批 {groupWorks.length} 个节点）
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleGroupWorks(groupWorks)}
                          className="rounded-full border border-sky-200 bg-white px-2.5 py-1 font-medium text-sky-700 hover:bg-sky-100"
                        >
                          {groupWorks.every((item) => selectedBatchWorkIds.has(item.id))
                            ? '取消选择同组节点'
                            : '选择同组节点'}
                        </button>
                      </div>
                    )}
                    <div
                      className={`list-separator flex items-start justify-between hover:translate-x-0.5 transition min-w-0 ${borderClass}`}
                    >
                      {tab === 'approving' && isBatchApprovable(work) && canBatchApproveInGroup && (
                        <div className="px-1 pt-5 pl-4">
                          <Checkbox
                            checked={selectedBatchWorkIds.has(work.id)}
                            onCheckedChange={(checked) =>
                              toggleBatchWork(work.id, checked === true)
                            }
                            aria-label={`选择工作节点：${work.workNode || work.title}`}
                          />
                        </div>
                      )}
                      <Link
                        href={`/${getRouteType(work)}/${work.id}`}
                        className="min-w-0 flex-1 p-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-sky-500/20"
                      >
                        <div className="text-sm font-medium text-slate-700 break-words leading-snug">
                          <WorkTitle work={work} />
                        </div>
                        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${getWorkTypeText(work.type)}`}>
                            {work.type}
                          </span>
                          <StatusBadge status={work.status} work={work} />
                          <span className="text-slate-400">
                            责任部门：
                            {departments.find((d) => d.id === work.departmentId)?.name || '-'}
                          </span>
                          <span className="text-slate-400">
                            完成时间：{getWorkDueDate(work) || '-'}
                          </span>
                          {work.approvalLeader && (
                            <span className="text-slate-400">公司领导：{work.approvalLeader}</span>
                          )}
                        </div>
                        {adjustmentReason && (
                          <div className="mt-1.5 rounded bg-purple-50/50 px-2 py-1 text-xs text-purple-600 break-words">
                            调整原因：{adjustmentReason}
                          </div>
                        )}
                        {work.rejectReason && (
                          <div className="text-xs text-rose-600 mt-1.5 break-words bg-rose-50/50 rounded px-2 py-1">
                            上次退回原因：{work.rejectReason}
                          </div>
                        )}
                        {work.cancelReason && (
                          <div className="text-xs text-slate-500 mt-1">
                            取消原因：{work.cancelReason}
                          </div>
                        )}
                      </Link>

                      <div className="flex gap-2 p-4 shrink-0">
                        {canApproveWork(user, work) && (
                          <>
                            <button
                              onClick={() => handleApproveClick(work)}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100 hover:-translate-y-0.5 transition-all"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              通过
                            </button>
                            <button
                              onClick={() => handleReject(work)}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100 hover:-translate-y-0.5 transition-all"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              退回
                            </button>
                          </>
                        )}

                        {!canApproveWork(user, work) && canHandleWork(user, work) && (
                          <Link href={`/${getRouteType(work)}/${work.id}`}>
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-100 hover:-translate-y-0.5 transition-all">
                              <Play className="h-3.5 w-3.5" />
                              处理
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
            </div>
            <WorkListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize)
                setPage(1)
              }}
            />
          </>
        )}
      </div>

      {selectedWork && (
        <ApproveDialog
          open={approveDialogOpen}
          onOpenChange={setApproveDialogOpen}
          onConfirm={handleApproveConfirm}
          companyLeaders={companyLeaders}
          needsLeaderSelection={
            user.role === 'DEPARTMENT_LEADER' &&
            !selectedWork.proposedLeaderId &&
            !selectedWork.approvalLeaderId
          }
          leaderName={selectedWork.approvalLeader || selectedWork.proposedLeader}
        />
      )}

      {canBatchApprove && (
        <ApproveDialog
          open={batchApproveDialogOpen}
          onOpenChange={setBatchApproveDialogOpen}
          onConfirm={executeBatchApprove}
          companyLeaders={companyLeaders}
          needsLeaderSelection={batchNeedsLeaderSelection}
          leaderName={
            selectedBatchWorks[0]?.approvalLeader || selectedBatchWorks[0]?.proposedLeader
          }
          title="批量审批通过"
          confirmLabel="确认批量通过"
        />
      )}
    </div>
  )
}
