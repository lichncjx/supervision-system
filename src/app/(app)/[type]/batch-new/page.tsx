'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { getDepartments } from '@/features/departments/client/department-api'
import { createWorkDraftsBatch } from '@/features/works/client/work-item-api'
import type { WorkItemOption } from '@/features/works/client/work-item-api'
import type { Department } from '@/features/departments/client/department-api'
import { Button } from '@/components/ui/button'
import { WorkItemCombobox } from '@/features/works/ui/work-item-combobox'
import {
  DepartmentField,
  IsInnovationField,
  PlanCompleteTimeField,
  ResponsibleFields,
  WorkItemField,
} from '@/features/works/ui/work-form-fields'
import { getSystemSettings } from '@/features/system-settings/client/system-settings-api'

interface BatchNodeForm {
  id: string
  workNode: string
  departmentId: string
  responsibleLeader: string
  responsiblePerson: string
  responsibleLeaderUserId?: number
  responsiblePersonUserId?: number
  planCompleteTime: string
  completeForm: string
}

function createNode(departmentId = ''): BatchNodeForm {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    workNode: '',
    departmentId,
    responsibleLeader: '',
    responsiblePerson: '',
    planCompleteTime: '',
    completeForm: '',
  }
}

export default function BatchNewWorkNodesPage() {
  const params = useParams<{ type: string }>()
  const requestedType = params?.type
  const routeType = requestedType === 'priority' ? 'priority' : 'main'
  const title = routeType === 'priority' ? '批量新增重点工作节点' : '批量新增主要工作节点'
  const { user } = useAuth()
  const router = useRouter()
  const [departments, setDepartments] = useState<Department[]>([])
  const initialAssessmentYearRef = useRef(String(new Date().getFullYear()))
  const [assessmentYear, setAssessmentYear] = useState(initialAssessmentYearRef.current)
  const [workItem, setWorkItem] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [isInnovation, setIsInnovation] = useState(false)
  const [workItemDefaultNotice, setWorkItemDefaultNotice] = useState('')
  const [rows, setRows] = useState<BatchNodeForm[]>([
    createNode(String(user?.departmentId || '')),
    createNode(String(user?.departmentId || '')),
  ])
  const [submitting, setSubmitting] = useState(false)

  const canCreate =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPERVISOR' ||
    user?.role === 'DEPARTMENT_MANAGER' ||
    user?.role === 'DEPARTMENT_LEADER'
  const isDepartmentUser = user?.role === 'DEPARTMENT_MANAGER' || user?.role === 'DEPARTMENT_LEADER'
  const availableDepartments = isDepartmentUser
    ? departments.filter((department) => department.id === user?.departmentId)
    : departments

  useEffect(() => {
    getDepartments().then((items) => setDepartments(items.filter((item) => item.isBusiness !== false)))
  }, [])

  useEffect(() => {
    getSystemSettings()
      .then((settings) => setAssessmentYear((current) => (
        current === initialAssessmentYearRef.current
          ? String(settings.defaultAssessmentYear)
          : current
      )))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!user?.departmentId) return
    setRows((current) => current.map((row) => (
      row.departmentId ? row : { ...row, departmentId: String(user.departmentId) }
    )))
  }, [user?.departmentId])

  const updateRow = (id: string, patch: Partial<BatchNodeForm>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = (source?: BatchNodeForm) => {
    const row = source
      ? { ...source, id: createNode().id, workNode: '' }
      : createNode(String(user?.departmentId || ''))
    setRows((current) => [...current, row])
  }

  const removeRow = (id: string) => {
    setRows((current) => (current.length <= 2 ? current : current.filter((row) => row.id !== id)))
  }

  const applyExistingWorkItemDefaults = (option: WorkItemOption) => {
    setWorkItem(option.workItem)
    if (option.businessCategoryConsistent) {
      setBusinessCategory(option.businessCategoryDefault || '')
    }
    if (routeType === 'priority' && option.isInnovationConsistent && option.isInnovationDefault !== null) {
      setIsInnovation(option.isInnovationDefault)
    }

    const inconsistentFields = [
      !option.businessCategoryConsistent && '业务类别',
      routeType === 'priority' && !option.isInnovationConsistent && '是否创新工作',
    ].filter(Boolean)
    setWorkItemDefaultNotice(
      inconsistentFields.length > 0
        ? `该工作事项的当前可见节点${inconsistentFields.join('、')}不一致，未自动带入，请确认后填写。`
        : routeType === 'priority'
          ? '已带入该工作事项当前可见节点一致的业务类别和是否创新工作。'
          : '已带入该工作事项当前可见节点一致的业务类别。',
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    if (!workItem.trim()) {
      alert('请选择已有工作事项，或输入名称后创建新工作事项')
      return
    }
    if (rows.some((row) => !row.workNode.trim() || !row.departmentId || !row.planCompleteTime)) {
      alert('请完善每个工作节点的节点名称、责任部门和完成时间')
      return
    }

    setSubmitting(true)
    try {
      const result = await createWorkDraftsBatch({
        type: routeType,
        assessmentYear: Number(assessmentYear),
        workItem,
        defaults: {
          businessCategory: businessCategory || null,
          isInnovation: routeType === 'priority' ? isInnovation : false,
        },
        nodes: rows.map(({ id: _id, departmentId, ...row }) => ({
          ...row,
          departmentId: Number(departmentId),
        })),
      })
      alert(`已创建 ${result.count || rows.length} 个工作节点草稿`)
      router.push(`/${routeType}?assessmentYear=${assessmentYear}&workItem=${encodeURIComponent(workItem)}`)
    } catch (error) {
      alert(error instanceof Error ? error.message : '批量创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (requestedType !== 'priority' && requestedType !== 'main') {
    return <div className="p-8 text-center text-red-600">待办事项不支持批量新增工作节点</div>
  }

  if (!canCreate) {
    return <div className="p-8 text-center text-red-600">无权限批量新增工作节点</div>
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">先确定工作事项归属，再逐行填写可独立办理和审批的工作节点。</p>
        </div>
        <Link href={`/${routeType}`}><Button type="button" variant="outline">返回列表</Button></Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800">工作事项归属</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <WorkItemField label="年度" value={assessmentYear} onChange={setAssessmentYear} placeholder="例如：2026" />
          <WorkItemCombobox
            value={workItem}
            onChange={(value) => {
              setWorkItem(value)
              setWorkItemDefaultNotice('')
            }}
            onSelectExisting={applyExistingWorkItemDefaults}
            type={routeType}
            assessmentYear={assessmentYear}
            departmentId={isDepartmentUser ? user?.departmentId : undefined}
          />
          {workItemDefaultNotice && (
            <p className="-mt-2 text-xs text-slate-500 md:col-span-2">{workItemDefaultNotice}</p>
          )}
          <WorkItemField label="业务类别（可选，默认应用于全部节点）" value={businessCategory} onChange={setBusinessCategory} placeholder="请输入业务类别" />
          {routeType === 'priority' && <IsInnovationField isInnovation={isInnovation} onChange={setIsInnovation} />}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">工作节点</h2>
            <p className="mt-1 text-sm text-slate-500">每行会创建一条独立草稿，可分别指定责任部门、责任人和完成时间。</p>
          </div>
          <Button type="button" variant="outline" onClick={() => addRow()}><Plus className="mr-1 h-4 w-4" />添加一行</Button>
        </div>

        <div className="mt-4 space-y-4">
          {rows.map((row, index) => (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">节点 {index + 1}</span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => addRow(row)}><Copy className="mr-1 h-3.5 w-3.5" />复制本行</Button>
                  <Button type="button" size="sm" variant="ghost" disabled={rows.length <= 2} onClick={() => removeRow(row.id)}><Trash2 className="mr-1 h-3.5 w-3.5" />删除</Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <WorkItemField label="工作节点" value={row.workNode} onChange={(workNode) => updateRow(row.id, { workNode })} placeholder="请输入工作节点" />
                <WorkItemField label="完成形式（可选）" value={row.completeForm} onChange={(completeForm) => updateRow(row.id, { completeForm })} placeholder="例如：验收报告" />
                <PlanCompleteTimeField label="完成时间" value={row.planCompleteTime} onChange={(planCompleteTime) => updateRow(row.id, { planCompleteTime })} />
                <DepartmentField
                  label="责任部门"
                  value={row.departmentId}
                  onChange={(departmentId) => updateRow(row.id, {
                    departmentId,
                    responsibleLeader: '',
                    responsiblePerson: '',
                    responsibleLeaderUserId: undefined,
                    responsiblePersonUserId: undefined,
                  })}
                  departments={availableDepartments}
                  placeholder="请选择责任部门"
                />
                <ResponsibleFields
                  leaderValue={row.responsibleLeader}
                  onLeaderChange={(responsibleLeader) => updateRow(row.id, { responsibleLeader })}
                  personValue={row.responsiblePerson}
                  onPersonChange={(responsiblePerson) => updateRow(row.id, { responsiblePerson })}
                  departmentId={Number(row.departmentId) || undefined}
                  leaderUserId={row.responsibleLeaderUserId}
                  onLeaderUserIdChange={(responsibleLeaderUserId) => updateRow(row.id, { responsibleLeaderUserId })}
                  personUserId={row.responsiblePersonUserId}
                  onPersonUserIdChange={(responsiblePersonUserId) => updateRow(row.id, { responsiblePersonUserId })}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl justify-end gap-3">
          <Link href={`/${routeType}`}><Button type="button" variant="outline">取消</Button></Link>
          <Button type="submit" disabled={submitting}>{submitting ? '正在创建…' : `保存 ${rows.length} 条草稿`}</Button>
        </div>
      </div>
    </form>
  )
}
