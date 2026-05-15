'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Plus, Pencil, Power, UserPlus, Link2, Unlink2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface MemberInfo {
  id: number; name: string; departmentId: number; departmentName: string
  phone: string | null; isLeader: boolean; sortOrder: number; isActive: boolean
  userId: number | null
  user: { id: number; username: string; name: string; isActive: boolean } | null
}

interface Department { id: number; name: string; code: string; isBusiness: boolean }

interface SystemUser {
  id: number; username: string; name: string; departmentId: number
  department: { name: string }; isActive: boolean
}

export default function AdminMembersPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [deptFilter, setDeptFilter] = useState<number | '全部'>('全部')
  const [isLoading, setIsLoading] = useState(true)

  const [createForm, setCreateForm] = useState({
    name: '', departmentId: 0, phone: '', isLeader: false, sortOrder: 0,
  })

  const [editTarget, setEditTarget] = useState<MemberInfo | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', phone: '', isLeader: false, sortOrder: 0, isActive: true,
  })

  const [bindTarget, setBindTarget] = useState<MemberInfo | null>(null)
  const [bindUserId, setBindUserId] = useState<string>('')

  const [importOpen, setImportOpen] = useState(false)
  const [importUserId, setImportUserId] = useState<string>('')
  const [importIsLeader, setImportIsLeader] = useState(false)
  const [importSortOrder, setImportSortOrder] = useState(0)
  const [importDeptId, setImportDeptId] = useState<number>(0)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    let depts: Department[] = []
    try {
      const [deptRes, userRes] = await Promise.all([
        fetch('/api/departments', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' }),
      ])
      if (deptRes.ok) {
        depts = await deptRes.json()
        setDepartments(depts)
      }
      if (userRes.ok) setSystemUsers(await userRes.json())
    } catch { /* ignore */ }
    await loadMembers(depts)
  }

  const businessDeptIds = new Set(departments.filter((d) => d.isBusiness).map((d) => d.id))

  const loadMembers = async (depts?: Department[]) => {
    const source = depts || departments
    setIsLoading(true)
    try {
      const all: MemberInfo[] = []
      for (const dept of source) {
        if (!dept.isBusiness) continue
        const res = await fetch(`/api/members?departmentId=${dept.id}&includeInactive=true`, { credentials: 'include' })
        if (res.ok) all.push(...(await res.json()))
      }
      setMembers(all)
    } catch { /* ignore */ }
    setIsLoading(false)
  }

  if (!user || user.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">无权限访问</div>
  }

  const bd = departments.filter((d) => businessDeptIds.has(d.id))
  const filtered = deptFilter === '全部' ? members : members.filter((m) => m.departmentId === deptFilter)

  const handleCreate = async () => {
    if (!createForm.name.trim()) { alert('请输入姓名'); return }
    if (!createForm.departmentId) { alert('请选择部门'); return }
    const res = await fetch('/api/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: createForm.name.trim(), departmentId: createForm.departmentId, phone: createForm.phone || null, isLeader: createForm.isLeader, sortOrder: createForm.sortOrder }),
      credentials: 'include',
    })
    if (!res.ok) { alert((await res.json()).error || '创建失败'); return }
    setCreateForm({ name: '', departmentId: 0, phone: '', isLeader: false, sortOrder: 0 })
    await loadMembers()
  }

  const handleEdit = (m: MemberInfo) => {
    setEditTarget(m)
    setEditForm({ name: m.name, phone: m.phone || '', isLeader: m.isLeader, sortOrder: m.sortOrder, isActive: m.isActive })
  }

  const handleSave = async () => {
    if (!editTarget) return
    const res = await fetch(`/api/members/${editTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm), credentials: 'include',
    })
    if (!res.ok) { alert((await res.json()).error || '保存失败'); return }
    const data = await res.json()
    if (data.warnings?.length) alert('提示：\n' + data.warnings.join('\n'))
    setEditTarget(null); await loadMembers()
  }

  const handleToggle = async (m: MemberInfo) => {
    const res = await fetch(`/api/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !m.isActive }), credentials: 'include',
    })
    if (!res.ok) { alert((await res.json()).error || '操作失败'); return }
    await loadMembers()
  }

  const handleUnbind = async (m: MemberInfo) => {
    if (!confirm(`确认解除 ${m.name} 与系统用户 ${m.user?.name} 的绑定？`)) return
    const res = await fetch(`/api/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: null }), credentials: 'include',
    })
    if (!res.ok) { alert((await res.json()).error || '解绑失败'); return }
    await loadMembers()
  }

  const handleBind = async () => {
    if (!bindTarget || !bindUserId) { alert('请选择系统用户'); return }
    const res = await fetch(`/api/members/${bindTarget.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: Number(bindUserId) }), credentials: 'include',
    })
    if (!res.ok) { alert((await res.json()).error || '绑定失败'); return }
    const data = await res.json()
    if (data.warnings?.length) alert('提示：\n' + data.warnings.join('\n'))
    setBindTarget(null); setBindUserId(''); await loadMembers()
  }

  const handleImport = async () => {
    if (!importUserId) { alert('请选择系统用户'); return }
    if (!importDeptId) { alert('请选择部门'); return }
    const res = await fetch('/api/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importFromUserId: Number(importUserId), departmentId: importDeptId, isLeader: importIsLeader, sortOrder: importSortOrder }),
      credentials: 'include',
    })
    if (!res.ok) { alert((await res.json()).error || '导入失败'); return }
    const data = await res.json()
    if (data.warnings?.length) alert('提示：\n' + data.warnings.join('\n'))
    setImportOpen(false); setImportUserId(''); setImportIsLeader(false); setImportSortOrder(0); setImportDeptId(0)
    await loadMembers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
          <span className="w-1 h-6 rounded-full bg-teal-500" />
          <Users className="h-6 w-6 text-teal-500" />
          部门人员管理
        </h1>
        <span className="text-sm text-slate-400">{members.filter((m) => m.isActive).length} 名在职</span>
      </div>

      {/* Create + Import */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">新增人员</h2>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setImportOpen(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />从系统用户导入
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-medium text-slate-400 mb-1">姓名</label>
            <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="如：张三" className="rounded-full" />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-slate-400 mb-1">部门</label>
            <Select value={createForm.departmentId ? String(createForm.departmentId) : ''} onValueChange={(v) => setCreateForm({ ...createForm, departmentId: Number(v) })}>
              <SelectTrigger className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 text-sm"><SelectValue placeholder="选择部门" /></SelectTrigger>
              <SelectContent>{bd.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-[100px]">
            <label className="block text-xs font-medium text-slate-400 mb-1">电话</label>
            <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="可选" className="rounded-full" />
          </div>
          <div className="min-w-[80px]">
            <label className="block text-xs font-medium text-slate-400 mb-1">排序</label>
            <Input type="number" value={createForm.sortOrder} onChange={(e) => setCreateForm({ ...createForm, sortOrder: Number(e.target.value) })} className="rounded-full" />
          </div>
          <label className="flex items-center gap-2 h-10 cursor-pointer">
            <Checkbox checked={createForm.isLeader} onCheckedChange={(checked) => setCreateForm({ ...createForm, isLeader: !!checked })} />
            <span className="text-sm text-slate-600">领导</span>
          </label>
          <Button onClick={handleCreate} className="rounded-full bg-slate-800 hover:bg-slate-900"><Plus className="h-4 w-4 mr-1" />新增</Button>
        </div>
      </div>

      {/* Member list */}
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-semibold text-slate-800">人员列表</h2>
          <Select value={typeof deptFilter === 'number' ? String(deptFilter) : deptFilter} onValueChange={(v) => setDeptFilter(v === '全部' ? '全部' : Number(v))}>
            <SelectTrigger className="rounded-full border border-slate-200 h-8 px-3 text-sm text-slate-600 bg-slate-50 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="全部">全部部门</SelectItem>
              {bd.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="p-5">
          {isLoading ? (
            <p className="text-center text-slate-400 py-8">加载中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8">该部门暂无人员</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((m) => (
                <div key={m.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all duration-200">
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${m.isActive ? 'bg-teal-50 text-teal-600 ring-1 ring-teal-200' : 'bg-red-50 text-red-500 ring-1 ring-red-200'}`}>{m.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{m.name}</span>
                      {m.isLeader && <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">领导</span>}
                      {!m.isActive && <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">已停用</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {m.departmentName}{m.phone ? ` · ${m.phone}` : ''}
                      {m.user ? <span className="ml-2 text-teal-600">🔗 {m.user.name} (@{m.user.username}){!m.user.isActive ? ' (已停用)' : ''}</span> : <span className="ml-2 text-slate-300">未绑定系统用户</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(m)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="编辑"><Pencil className="w-4 h-4" /></button>
                    {m.userId ? (
                      <button onClick={() => handleUnbind(m)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors" title="解绑系统用户"><Unlink2 className="w-4 h-4" /></button>
                    ) : (
                      <button onClick={() => { setBindTarget(m); setBindUserId('') }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors" title="绑定系统用户"><Link2 className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => handleToggle(m)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title={m.isActive ? '停用' : '启用'}><Power className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 mt-2">
            <span className="text-sm text-slate-500">共 {filtered.length} 人</span>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑人员信息</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">姓名</label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="rounded-full mt-1" /></div>
            <div><label className="text-sm font-medium">电话</label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="rounded-full mt-1" placeholder="可选" /></div>
            <div><label className="text-sm font-medium">排序</label><Input type="number" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: Number(e.target.value) })} className="rounded-full mt-1" /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={editForm.isLeader} onCheckedChange={(checked) => setEditForm({ ...editForm, isLeader: !!checked })} />设为部门领导</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={editForm.isActive} onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: !!checked })} />启用</label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setEditTarget(null)}>取消</Button>
            <Button className="rounded-full" onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bind Dialog */}
      <Dialog open={!!bindTarget} onOpenChange={(open) => !open && setBindTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>绑定系统用户</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">人员：{bindTarget?.name} · {bindTarget?.departmentName}</p>
            <div>
              <label className="text-sm font-medium">选择系统用户</label>
              <Select value={bindUserId} onValueChange={setBindUserId}>
                <SelectTrigger className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 w-full text-sm mt-1"><SelectValue placeholder="请选择用户" /></SelectTrigger>
                <SelectContent>
                  {systemUsers.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name} (@{u.username}) · {u.department?.name || '-'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-400">绑定后该人员可关联系统账号。如姓名或部门不一致，系统会给出提示但不强制拦截。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setBindTarget(null)}>取消</Button>
            <Button className="rounded-full" onClick={handleBind}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>从系统用户导入</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">选择系统用户</label>
              <Select value={importUserId} onValueChange={setImportUserId}>
                <SelectTrigger className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 w-full text-sm mt-1"><SelectValue placeholder="选择用户" /></SelectTrigger>
                <SelectContent>{systemUsers.filter((u) => u.isActive).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.name} (@{u.username}) · {u.department?.name || '-'}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">目标部门</label>
              <Select value={importDeptId ? String(importDeptId) : ''} onValueChange={(v) => setImportDeptId(Number(v))}>
                <SelectTrigger className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 w-full text-sm mt-1"><SelectValue placeholder="选择部门" /></SelectTrigger>
                <SelectContent>{bd.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">排序</label><Input type="number" value={importSortOrder} onChange={(e) => setImportSortOrder(Number(e.target.value))} className="rounded-full mt-1" /></div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={importIsLeader} onCheckedChange={(checked) => setImportIsLeader(!!checked)} />设为部门领导</label>
            <p className="text-xs text-slate-400">导入后自动从用户资料填充姓名、电话，并绑定系统用户。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setImportOpen(false)}>取消</Button>
            <Button className="rounded-full" onClick={handleImport}>导入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
