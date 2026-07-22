'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchAndPagination } from '@/features/works/client/use-search-pagination'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { isCompanyLevel, isGlobalView } from '@/features/users/domain/role.rules'
import { getDepartments } from '@/features/departments/client/department-api'
import type { Department } from '@/features/departments/client/department-api'
import { queryWorks } from '@/features/works/client/work-api'
import type { Work } from '@/features/works/client/work-client.types'
import type { WorkType, WorkStatusFilter } from '@/features/works/client/work-client.types'
import { workTypeColors, getStatusAccent } from '@/features/works/ui/status-colors'
import { Plus, Download, Upload, FileSpreadsheet, Star, ListTodo, CheckSquare, ChevronDown } from 'lucide-react'
import { WorkListToolbar } from '@/features/works/ui/work-list-toolbar'
import { PriorityMainWorkListItem } from '@/features/works/ui/priority-main-work-list-item'
import { TodoWorkListItem } from '@/features/works/ui/todo-work-list-item'
import { WorkListPagination } from '@/features/works/ui/work-list-pagination'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { getCompanyLeaders } from '@/features/users/client/user-api'
import type { User } from '@/features/users/client/user-client.types'
import { executeBatchWorkflow, previewBatchWorkflow } from '@/features/workflow/client/workflow-api'
import { ApproveDialog } from '@/features/workflow/ui/approve-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { normalizeAssessmentYear } from '@/features/works/domain/work-structure.rules'
import { getSystemSettings } from '@/features/system-settings/client/system-settings-api'
import { resolveQueryAssessmentYear, saveQueryYearPreference } from '@/features/system-settings/client/query-year-preference'

const pillButton =
  'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:-translate-y-0.5 transition-all'
const DEFAULT_ASSESSMENT_YEAR = String(new Date().getFullYear())

interface ImportIssue {
  row: number
  field: string
  value: string
  reason: string
}

interface ImportPreview {
  previewToken?: string
  rows: Array<{
    row: number
    workItem: string
    workNode: string | null
    departmentName: string | null
    responsiblePerson: string | null
  }>
  errors: ImportIssue[]
  warnings: ImportIssue[]
}

export default function ItemListPage() {
  const params = useParams<{ type: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const routeType = params?.type || 'todo'
  const { user } = useAuth()
  const [list, setList] = useState<Work[]>([])
  const [keyword, setKeyword] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<number | '全部'>('全部')
  const [statusFilter, setStatusFilter] = useState<WorkStatusFilter>('all')
  const [monthFilter, setMonthFilter] = useState('')
  const [assessmentYearFilter, setAssessmentYearFilter] = useState(DEFAULT_ASSESSMENT_YEAR)
  const [systemDefaultYear, setSystemDefaultYear] = useState<number | null>(null)
  const importYearTouchedRef = useRef(false)
  const [workItemFilter, setWorkItemFilter] = useState('')
  const [departments, setDepartments] = useState<Department[]>([])
  const [companyLeaders, setCompanyLeaders] = useState<User[]>([])
  const companyLevel = isGlobalView(user?.role) || isCompanyLevel(user?.role)

  useEffect(() => {
    if (!user) return
    getSystemSettings()
      .then((settings) => {
        setSystemDefaultYear(settings.defaultAssessmentYear)
        if (!importYearTouchedRef.current) setImportYear(String(settings.defaultAssessmentYear))
      })
      .catch(() => setSystemDefaultYear(Number(DEFAULT_ASSESSMENT_YEAR)))
  }, [user])

  useEffect(() => {
    const fetchDepartments = async () => {
      const depts = await getDepartments()
      setDepartments(depts)
    }
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (!user || !systemDefaultYear) return
    const yearParam = searchParams.get('assessmentYear')
    const normalizedYear = normalizeAssessmentYear(yearParam)
    const fallbackYear = String(resolveQueryAssessmentYear({ userId: user.id, defaultYear: systemDefaultYear }))

    if (yearParam === 'all') {
      setAssessmentYearFilter('')
    } else if (normalizedYear) {
      setAssessmentYearFilter(String(normalizedYear))
    } else {
      setAssessmentYearFilter(fallbackYear)
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.set('assessmentYear', fallbackYear)
      router.replace(`/${routeType}?${nextParams.toString()}`, { scroll: false })
    }
    setWorkItemFilter(searchParams.get('workItem') || '')
  }, [routeType, router, searchParams, systemDefaultYear, user])

  useEffect(() => {
    getCompanyLeaders()
      .then(setCompanyLeaders)
      .catch(() => setCompanyLeaders([]))
  }, [])

  const type = routeType === 'priority' ? '重点' : routeType === 'main' ? '主要' : '待办'
  const isPriorityOrMain = type === '重点' || type === '主要'

  const titleMap: Record<WorkType, string> = {
    重点: '重点工作',
    主要: '主要工作',
    待办: '待办事项',
  }

  const routeKey =
    routeType === 'priority'
      ? ('priority' as const)
      : routeType === 'main'
        ? ('main' as const)
        : ('todo' as const)
  const c = workTypeColors[routeKey]
  const accentBar =
    routeType === 'priority'
      ? 'bg-rose-500'
      : routeType === 'main'
        ? 'bg-sky-500'
        : 'bg-emerald-500'
  const iconColor =
    routeType === 'priority'
      ? 'text-rose-500'
      : routeType === 'main'
        ? 'text-sky-500'
        : 'text-emerald-500'
  const TitleIcon = routeType === 'priority' ? Star : routeType === 'main' ? ListTodo : CheckSquare

  const canCreate =
    type === '待办'
      ? user?.role === 'ADMIN' ||
        user?.role === 'DEPARTMENT_MANAGER' ||
        user?.role === 'DEPARTMENT_LEADER' ||
        user?.role === 'VICE_PRESIDENT' ||
        user?.role === 'PRESIDENT' ||
        user?.role === 'SUPERVISOR'
      : user?.role === 'ADMIN' ||
        user?.role === 'DEPARTMENT_MANAGER' ||
        user?.role === 'DEPARTMENT_LEADER' ||
        user?.role === 'SUPERVISOR'

  const getWorkMonth = (work: Work) => {
    const date = work.planCompleteTime || ''
    if (!date) return ''
    return String(date).slice(0, 7)
  }

  const getMonthLabel = (month: string) => {
    if (!month) return ''
    const [year, m] = month.split('-')
    return `${year}年${Number(m)}月`
  }

  const monthOptions = Array.from(
    new Set(list.map((work) => getWorkMonth(work)).filter(Boolean)),
  ).sort()

  const fetchList = async () => {
    if (!user || !systemDefaultYear) return
    const data = await queryWorks({
      type,
      departmentId: companyLevel ? departmentFilter : (user?.departmentId ?? undefined),
      status: statusFilter,
      keyword,
      assessmentYear: assessmentYearFilter ? Number(assessmentYearFilter) : null,
      workItem: workItemFilter || undefined,
    })
    setList(data)
  }

  useEffect(() => {
    void fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, systemDefaultYear, type, departmentFilter, statusFilter, keyword, assessmentYearFilter, workItemFilter])

  const filteredList = useMemo(() => {
    if (monthFilter) {
      return list.filter((work) => getWorkMonth(work) === monthFilter)
    }
    return list
  }, [list, monthFilter])

  const {
    list: pagedList,
    total,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useSearchAndPagination(filteredList, '', [
    keyword,
    departmentFilter,
    statusFilter,
    monthFilter,
    assessmentYearFilter,
    workItemFilter,
    type,
  ])

  const getDepartmentName = (id: number) => {
    return departments.find((d) => d.id === id)?.name || '-'
  }

  const handleExport = async () => {
    const params = new URLSearchParams()
    params.set('type', routeType)
    if (keyword) params.set('keyword', keyword)
    if (departmentFilter !== '全部') params.set('departmentId', String(departmentFilter))
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (assessmentYearFilter) params.set('assessmentYear', assessmentYearFilter)
    if (workItemFilter) params.set('workItem', workItemFilter)
    if (monthFilter) params.set('month', monthFilter)

    try {
      const res = await fetch(`/api/excel/export?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '导出失败' }))
        alert(err.message || '导出失败')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('导出失败，请检查网络连接')
    }
  }

  const handleAssessmentYearFilterChange = (nextYear: string) => {
    const yearChanged = nextYear !== assessmentYearFilter
    setAssessmentYearFilter(nextYear)
    setMonthFilter('')
    if (yearChanged) setWorkItemFilter('')
    if (nextYear && user) saveQueryYearPreference(user.id, nextYear)

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('assessmentYear', nextYear || 'all')
    if (yearChanged) nextParams.delete('workItem')
    router.replace(`/${routeType}?${nextParams.toString()}`, { scroll: false })
  }

  const handleClearWorkItemFilter = () => {
    setWorkItemFilter('')
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete('workItem')
    router.replace(`/${routeType}?${nextParams.toString()}`, { scroll: false })
  }

  const handleReset = () => {
    setKeyword('')
    setMonthFilter('')
    setDepartmentFilter('全部')
    setStatusFilter('all')
    const fallbackYear = systemDefaultYear && user
      ? String(resolveQueryAssessmentYear({ userId: user.id, defaultYear: systemDefaultYear }))
      : DEFAULT_ASSESSMENT_YEAR
    setAssessmentYearFilter(fallbackYear)
    setWorkItemFilter('')
    router.replace(`/${routeType}?assessmentYear=${fallbackYear}`, { scroll: false })
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1)
  }

  const importInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importYear, setImportYear] = useState(String(new Date().getFullYear()))
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isPreviewingImport, setIsPreviewingImport] = useState(false)
  const [isConfirmingImport, setIsConfirmingImport] = useState(false)
  const [selectedBatchWorkIds, setSelectedBatchWorkIds] = useState<Set<number>>(new Set())
  const [batchSubmitDialogOpen, setBatchSubmitDialogOpen] = useState(false)
  const importYearOptions = Array.from({ length: 7 }, (_, index) =>
    String(new Date().getFullYear() - 3 + index),
  )
  const isBatchSubmittable = (work: Work) =>
    isPriorityOrMain && work.status === 'draft' && work.creatorId === user?.id
  const selectedBatchWorks = list.filter((work) => selectedBatchWorkIds.has(work.id))
  const selectedDraftBatchWorks = selectedBatchWorks.filter(isBatchSubmittable)
  const hasOnlySubmittableSelectedBatchWorks =
    selectedBatchWorks.length === selectedDraftBatchWorks.length
  const firstSelectedBatchWork = selectedDraftBatchWorks[0]
  const hasSameBatchGroup =
    selectedDraftBatchWorks.length >= 2 &&
    !!firstSelectedBatchWork?.assessmentYear &&
    !!firstSelectedBatchWork.workItem &&
    selectedDraftBatchWorks.every(
      (work) =>
        work.type === firstSelectedBatchWork.type &&
        work.assessmentYear === firstSelectedBatchWork.assessmentYear &&
        work.workItem === firstSelectedBatchWork.workItem,
    )
  const allSelectedBatchWorksHaveResponsiblePerson = selectedDraftBatchWorks.every(
    (work) => !!work.responsiblePersonUserId,
  )
  const canBatchSubmit =
    selectedDraftBatchWorks.length >= 2 &&
    hasOnlySubmittableSelectedBatchWorks &&
    hasSameBatchGroup &&
    allSelectedBatchWorksHaveResponsiblePerson
  const batchSubmitHint = !hasOnlySubmittableSelectedBatchWorks
    ? '仅可批量提交当前用户创建的重点/主要工作草稿节点。'
    : !hasSameBatchGroup
    ? '批量提交仅支持同一年度、同一类型、同一工作事项下的草稿工作节点。'
    : !allSelectedBatchWorksHaveResponsiblePerson
      ? '所选工作节点均须指定责任人后才能批量提交。'
      : '所选草稿工作节点可批量提交，提交前仍会校验审批路由。'
  const batchNeedsLeaderSelection =
    user?.role === 'DEPARTMENT_LEADER' &&
    selectedBatchWorks.length > 0 &&
    selectedBatchWorks.every((work) => !work.proposedLeaderId && !work.approvalLeaderId)
  const toggleBatchWork = (workId: number, checked: boolean) => {
    setSelectedBatchWorkIds((current) => {
      const next = new Set(current)
      if (checked) next.add(workId)
      else next.delete(workId)
      return next
    })
  }

  const executeBatchSubmit = async (comment?: string, nextApproverId?: number | null) => {
    if (!canBatchSubmit) return
    const payload = {
      action: 'submit' as const,
      items: selectedBatchWorks.map((work) => ({ id: work.id, updatedAt: work.updatedAt })),
      ...(comment ? { comment } : {}),
      ...(nextApproverId ? { nextApproverId } : {}),
    }
    try {
      await previewBatchWorkflow(payload)
      await executeBatchWorkflow(payload)
      setSelectedBatchWorkIds(new Set())
      await fetchList()
      alert('批量提交成功')
    } catch (error) {
      alert(error instanceof Error ? error.message : '批量提交失败，请刷新后重试')
    }
  }

  const handleBatchSubmitClick = () => {
    if (!canBatchSubmit) {
      alert(batchSubmitHint)
      return
    }
    if (batchNeedsLeaderSelection) {
      setBatchSubmitDialogOpen(true)
      return
    }
    void executeBatchSubmit()
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    importYearTouchedRef.current = false
    setImportYear(String(systemDefaultYear || new Date().getFullYear()))
    setImportPreview(null)
    setIsImportDialogOpen(true)
    e.target.value = ''
  }

  const createImportFormData = () => {
    if (!importFile) return null

    const formData = new FormData()
    formData.append('file', importFile)
    formData.append('assessmentYear', importYear)
    return formData
  }

  const handlePreviewImport = async () => {
    const formData = createImportFormData()
    if (!formData) return

    setIsPreviewingImport(true)
    setImportPreview(null)

    try {
      const response = await fetch(`/api/excel/import/${routeType}/preview`, {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as ImportPreview & { message?: string }
      if (!response.ok) {
        setImportPreview({
          rows: [],
          warnings: [],
          errors: [{ row: 0, field: 'file', value: '', reason: result.message || '导入预览失败' }],
        })
      } else {
        setImportPreview(result)
      }
    } catch {
      setImportPreview({
        rows: [],
        warnings: [],
        errors: [{ row: 0, field: 'file', value: '', reason: '导入预览失败，请检查网络连接' }],
      })
    } finally {
      setIsPreviewingImport(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!importPreview?.previewToken) return
    const formData = createImportFormData()
    if (!formData) return
    formData.append('previewToken', importPreview.previewToken)

    setIsConfirmingImport(true)
    try {
      const response = await fetch(`/api/excel/import/${routeType}`, {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as { message?: string }
      if (!response.ok) {
        setImportPreview({
          ...importPreview,
          previewToken: undefined,
          errors: [
            {
              row: 0,
              field: '导入确认',
              value: '',
              reason: result.message || '导入失败，请重新预览',
            },
          ],
        })
        return
      }

      setIsImportDialogOpen(false)
      setImportFile(null)
      setImportPreview(null)
      await fetchList()
      alert('导入成功')
    } catch {
      setImportPreview({
        ...importPreview,
        previewToken: undefined,
        errors: [{ row: 0, field: '导入确认', value: '', reason: '导入失败，请重新预览' }],
      })
    } finally {
      setIsConfirmingImport(false)
    }
  }

  const canConfirmImport =
    importPreview !== null &&
    Boolean(importPreview.previewToken) &&
    importPreview.errors.length === 0 &&
    !isConfirmingImport

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`/api/excel/template/${routeType}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '下载模板失败' }))
        alert(err.message || '下载模板失败')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('下载模板失败，请检查网络连接')
    }
  }

  return (
    <div className="space-y-6">
      <div className="stagger-1 flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
          <span className={`w-1 h-6 rounded-full ${accentBar}`} />
          <TitleIcon className={`h-6 w-6 ${iconColor}`} />
          {titleMap[type]}
        </h1>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className={pillButton}>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            下载模板
          </button>
          <button onClick={() => importInputRef.current?.click()} className={pillButton}>
            <Upload className="h-3.5 w-3.5" />
            导入
          </button>
          <button onClick={handleExport} className={pillButton}>
            <Download className="h-3.5 w-3.5" />
            导出
          </button>
          {canCreate && isPriorityOrMain && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium hover:-translate-y-0.5 transition-all ${c.button}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  新增工作节点
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/${routeType}/new`}>新增单个工作节点</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${routeType}/batch-new`}>批量新增工作节点</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canCreate && !isPriorityOrMain && (
            <Link
              href={`/${routeType}/new`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium hover:-translate-y-0.5 transition-all ${c.button}`}
            >
              <Plus className="h-3.5 w-3.5" />
              新建{titleMap[type]}
            </Link>
          )}
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportExcel}
      />

      <Dialog
        open={isImportDialogOpen}
        onOpenChange={(open) => {
          setIsImportDialogOpen(open)
          if (!open) setImportPreview(null)
        }}
      >
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Excel 导入预览</DialogTitle>
            <DialogDescription>
              {importFile ? `文件：${importFile.name}` : '请选择要导入的 Excel 文件'}
              。确认导入前会重新校验文件、年度和权限。
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">年度</label>
            <Select
              value={importYear}
              onValueChange={(value) => {
                importYearTouchedRef.current = true
                setImportYear(value)
                setImportPreview(null)
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {importYearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {importPreview && (
            <div className="space-y-3 text-sm">
              {importPreview.errors.length > 0 && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700">
                  <p className="font-medium">
                    发现 {importPreview.errors.length} 个错误，修正后请重新预览。
                  </p>
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {importPreview.errors.map((issue, index) => (
                      <li key={`${issue.row}-${issue.field}-${index}`}>
                        {issue.row ? `第 ${issue.row} 行：` : ''}
                        {issue.field}：{issue.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {importPreview.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  <p className="font-medium">
                    发现 {importPreview.warnings.length} 条提醒，可确认后继续导入。
                  </p>
                  <ul className="mt-2 space-y-1">
                    {importPreview.warnings.map((issue, index) => (
                      <li key={`${issue.row}-${issue.field}-${index}`}>
                        第 {issue.row} 行：{issue.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {importPreview.rows.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2">行</th>
                        <th className="px-3 py-2">工作事项</th>
                        <th className="px-3 py-2">工作节点</th>
                        <th className="px-3 py-2">责任部门</th>
                        <th className="px-3 py-2">责任人</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.rows.map((row) => (
                        <tr key={row.row} className="border-t border-slate-100 text-slate-700">
                          <td className="px-3 py-2">{row.row}</td>
                          <td className="px-3 py-2">{row.workItem}</td>
                          <td className="px-3 py-2">{row.workNode || '-'}</td>
                          <td className="px-3 py-2">{row.departmentName || '-'}</td>
                          <td className="px-3 py-2">{row.responsiblePerson || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              onClick={handlePreviewImport}
              disabled={!importFile || isPreviewingImport || isConfirmingImport}
            >
              {isPreviewingImport ? '正在预览…' : importPreview ? '重新预览' : '开始预览'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={
                canConfirmImport
                  ? 'rounded-full border-sky-600 bg-sky-600 text-white hover:bg-sky-700 hover:text-white'
                  : 'rounded-full border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-400'
              }
              onClick={handleConfirmImport}
              disabled={!canConfirmImport}
            >
              {isConfirmingImport ? '正在导入…' : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WorkListToolbar
        keyword={keyword}
        onKeywordChange={setKeyword}
        assessmentYearFilter={assessmentYearFilter}
        onAssessmentYearFilterChange={handleAssessmentYearFilterChange}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
        monthOptions={monthOptions}
        getMonthLabel={getMonthLabel}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        departments={departments}
        companyLevel={companyLevel}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onReset={handleReset}
        onRefresh={() => void fetchList()}
      />

      {workItemFilter && (
        <div className="flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          <span>当前工作事项：{workItemFilter}</span>
          <button
            type="button"
            className="font-medium text-sky-700 hover:underline"
            onClick={handleClearWorkItemFilter}
          >
            清除事项筛选
          </button>
        </div>
      )}

      {isPriorityOrMain && selectedDraftBatchWorks.length >= 2 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span>{batchSubmitHint}</span>
          <Button
            type="button"
            onClick={handleBatchSubmitClick}
            variant="outline"
            size="sm"
            disabled={!canBatchSubmit}
            className="rounded-full border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-700"
          >
            批量提交（{selectedDraftBatchWorks.length}）
          </Button>
        </div>
      )}

      <div className="stagger-2 text-sm text-slate-500">
        当前共筛选出 {total} 项{titleMap[type]}，当前第 {page} / {totalPages} 页
      </div>

      <div className="stagger-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        {total === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">暂无{titleMap[type]}</div>
        ) : (
          <>
            <div>
              {pagedList.map((item) => (
                <div key={item.id} className={`p-4 list-separator ${getStatusAccent(item.status)}`}>
                  <div className="flex items-start gap-3">
                    {isBatchSubmittable(item) && (
                      <Checkbox
                        className="mt-4"
                        checked={selectedBatchWorkIds.has(item.id)}
                        onCheckedChange={(checked) => toggleBatchWork(item.id, checked === true)}
                        aria-label={`选择工作节点：${item.workNode || item.title}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {isPriorityOrMain ? (
                        <PriorityMainWorkListItem
                          item={item}
                          routeType={routeType}
                          getDepartmentName={getDepartmentName}
                        />
                      ) : (
                        <TodoWorkListItem
                          item={item}
                          routeType={routeType}
                          getDepartmentName={getDepartmentName}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <WorkListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>

      {selectedBatchWorks.length >= 2 && (
        <ApproveDialog
          open={batchSubmitDialogOpen}
          onOpenChange={setBatchSubmitDialogOpen}
          onConfirm={executeBatchSubmit}
          companyLeaders={companyLeaders}
          needsLeaderSelection={batchNeedsLeaderSelection}
          leaderName={
            selectedBatchWorks[0]?.approvalLeader || selectedBatchWorks[0]?.proposedLeader
          }
          title="批量提交审批"
          commentLabel="提交说明（可选）"
          confirmLabel="确认批量提交"
        />
      )}
    </div>
  )
}
