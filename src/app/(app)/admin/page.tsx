'use client';

import { useState, useEffect } from 'react';
import { Building2, Settings, ShieldCheck, Users, Plus, Trash2, Power, KeyRound, Eye, EyeOff, Pencil } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getRoleName, type Role } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  departmentId: number;
  departmentName: string;
  isActive: boolean;
  email?: string;
  phone?: string;
  isProtected?: boolean;
}

interface Department {
  id: number;
  name: string;
  code: string;
  isBusiness: boolean;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [userList, setUserList] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<number | '全部'>('全部');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState({
    username: '',
    password: '123456',
    name: '',
    role: 'DEPARTMENT_MANAGER' as Role,
    departmentId: 2,
  });

  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<User | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'DEPARTMENT_MANAGER' as Role,
    departmentId: 2,
    email: '',
    phone: '',
    isActive: true,
  });

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUserList(data);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Fetch departments error:', error);
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">无权限访问系统管理</div>;
  }

  const filteredUsers = deptFilter === '全部'
    ? userList
    : userList.filter(u => u.departmentId === deptFilter);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const pagedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const handleDeptFilterChange = (value: number | '全部') => {
    setDeptFilter(value);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  const handleAddUser = async () => {
    try {
      if (!form.username.trim()) {
        alert('请输入用户名');
        return;
      }
      if (!form.name.trim()) {
        alert('请输入姓名');
        return;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username.trim(),
          password: form.password || '123456',
          name: form.name.trim(),
          role: form.role,
          departmentId: form.departmentId,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || '创建失败');
        return;
      }

      setForm({
        username: '',
        password: '123456',
        name: '',
        role: 'DEPARTMENT_MANAGER',
        departmentId: 2,
      });

      fetchUsers();
      alert('用户创建成功');
    } catch (e) {
      alert((e as Error).message || '创建失败');
    }
  };

  const handleToggleActive = async (u: User) => {
    try {
      const response = await fetch(`/api/users/${u.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !u.isActive }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || '操作失败');
        return;
      }

      fetchUsers();
    } catch (e) {
      alert((e as Error).message || '操作失败');
    }
  };

  const handleDelete = async (u: User) => {
    try {
      if (!confirm(`确认删除用户：${u.name}？`)) return;

      const response = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || '删除失败');
        return;
      }

      fetchUsers();
    } catch (e) {
      alert((e as Error).message || '删除失败');
    }
  };

  const openAdminPasswordDialog = (target: User) => {
    setPasswordTarget(target);
    setAdminPassword('');
    setShowAdminPassword(false);
  };

  const handleAdminChangePassword = async () => {
    if (!passwordTarget) return;

    const nextPassword = adminPassword.trim();

    if (!nextPassword) {
      alert('请输入新密码');
      return;
    }

    if (nextPassword.length < 6) {
      alert('新密码至少6位');
      return;
    }

    try {
      const response = await fetch(`/api/users/${passwordTarget.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: nextPassword }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || '修改失败');
        return;
      }

      setPasswordTarget(null);
      setAdminPassword('');
      setShowAdminPassword(false);
      fetchUsers();
      alert('密码修改成功');
    } catch (e) {
      alert((e as Error).message || '修改失败');
    }
  };

  const openEditDialog = (target: User) => {
    setEditTarget(target);
    setEditForm({
      name: target.name,
      role: target.role as Role,
      departmentId: target.departmentId,
      email: target.email || '',
      phone: target.phone || '',
      isActive: target.isActive,
    });
  };

  const handleEditUser = async () => {
    if (!editTarget) return;

    try {
      const response = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || '修改失败');
        return;
      }

      setEditTarget(null);
      fetchUsers();
      alert('用户信息修改成功');
    } catch (e) {
      alert((e as Error).message || '修改失败');
    }
  };

  const roleOptions: { label: string; value: Role }[] = [
    { label: '系统管理员', value: 'ADMIN' },
    { label: '督办管理员', value: 'SUPERVISOR' },
    { label: '部门主管', value: 'DEPARTMENT_MANAGER' },
    { label: '部门领导', value: 'DEPARTMENT_LEADER' },
    { label: '公司主管领导', value: 'VICE_PRESIDENT' },
    { label: '公司主要领导', value: 'PRESIDENT' },
  ];

  const isCompanyRole =
    form.role === 'ADMIN' ||
    form.role === 'SUPERVISOR' ||
    form.role === 'VICE_PRESIDENT' ||
    form.role === 'PRESIDENT';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-7 w-7" />
        系统管理
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl p-6 flex items-center justify-between border border-slate-200/80 hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm text-slate-500">部门数量</p>
            <p className="text-3xl font-bold">{departments.length}</p>
          </div>
          <Building2 className="h-8 w-8 text-blue-600" />
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl p-6 flex items-center justify-between border border-slate-200/80 hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm text-slate-500">用户数量</p>
            <p className="text-3xl font-bold">{userList.length}</p>
          </div>
          <Users className="h-8 w-8 text-green-600" />
        </div>

        <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl p-6 flex items-center justify-between border border-slate-200/80 hover:shadow-md transition-shadow">
          <div>
            <p className="text-sm text-slate-500">角色数量</p>
            <p className="text-3xl font-bold">6</p>
          </div>
          <ShieldCheck className="h-8 w-8 text-purple-600" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        <h2 className="font-semibold text-slate-800 px-5 pt-5">新增用户账号</h2>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-slate-400 mb-1">姓名</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：张三"
                className="rounded-full"
              />
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-slate-400 mb-1">用户名</label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="如：zhangsan"
                className="rounded-full"
              />
            </div>

            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-medium text-slate-400 mb-1">初始密码</label>
              <div className="relative">
                <Input
                  type={showCreatePassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="默认123456"
                  className="pr-10 rounded-full"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="w-[140px]">
              <label className="block text-xs font-medium text-slate-400 mb-1">角色</label>
              <select
                className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 w-full text-sm text-slate-600"
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value as Role,
                  departmentId:
                    e.target.value === 'ADMIN' ||
                    e.target.value === 'SUPERVISOR' ||
                    e.target.value === 'VICE_PRESIDENT' ||
                    e.target.value === 'PRESIDENT'
                      ? 1
                      : 2,
                })
              }
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[150px]">
            <label className="block text-xs font-medium text-slate-400 mb-1">所属部门</label>
            <select
              className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 w-full text-sm text-slate-600"
              value={form.departmentId}
              disabled={isCompanyRole}
              onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value) })}
            >
              {departments
                .filter((d) => (isCompanyRole ? d.id === 1 : d.id !== 1))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>

          <button onClick={handleAddUser} className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-900 transition-colors">
            <Plus className="h-4 w-4" />
            新增
          </button>
        </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-semibold text-slate-800">用户列表</h2>
          <select
            value={deptFilter}
            onChange={(e) => handleDeptFilterChange(e.target.value === '全部' ? '全部' : Number(e.target.value))}
            className="rounded-full border border-slate-200 h-8 px-3 text-sm text-slate-600 bg-slate-50"
          >
            <option value="全部">全部部门</option>
            {departments.filter(d => d.isBusiness).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="p-5">
          <div className="space-y-3">
            {pagedUsers.map((u) => (
              <div key={u.id} className="group flex items-center gap-4 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all duration-200">
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${u.isActive ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' : 'bg-red-50 text-red-500 ring-1 ring-red-200'}`}>
                  {u.name.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{u.name}</span>
                    {!u.isActive && <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">已停用</span>}
                    {u.isProtected && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">内置账号</span>}
                    <span className="text-xs text-slate-400">@{u.username}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {u.departmentName} · <span className="text-slate-500">{getRoleName(u.role)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditDialog(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="编辑">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => openAdminPasswordDialog(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="修改密码">
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggleActive(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title={u.isActive ? '停用' : '启用'}>
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(u)} disabled={u.isProtected} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-20 disabled:hover:bg-transparent" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-sm text-slate-500">共 {filteredUsers.length} 人</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                ←
              </button>
              <span className="text-sm font-medium text-slate-600 w-16 text-center tabular-nums">{page}/{totalPages}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        <h2 className="font-semibold text-slate-800 px-5 pt-5">部门列表</h2>
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            {departments.map((dept, i) => (
              <div
                key={dept.id}
                className="group inline-flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full border border-slate-200/80 bg-white/60 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="text-[11px] font-bold tracking-wider text-slate-400 font-mono tabular-nums">
                  {dept.code}
                </span>
                <span className="text-sm font-medium text-slate-700">{dept.name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    dept.isBusiness
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.3)]'
                      : 'bg-slate-300'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!passwordTarget} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">用户名</label>
              <p className="mt-1 text-sm text-slate-500">{passwordTarget?.name} ({passwordTarget?.username})</p>
            </div>

            <div>
              <label className="text-sm font-medium">新密码</label>
              <div className="relative mt-1">
                <Input
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setPasswordTarget(null)}>
              取消
            </Button>
            <Button className="rounded-full" onClick={handleAdminChangePassword}>
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户信息</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">用户名</label>
              <p className="mt-1 text-sm text-slate-500">{editTarget?.username}</p>
            </div>

            <div>
              <label className="text-sm font-medium">姓名</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">角色</label>
              <select
                className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 w-full text-sm text-slate-600 mt-1"
                value={editForm.role}
                onChange={(e) => {
                  const newRole = e.target.value as Role;
                  const isCompany = ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'].includes(newRole);
                  setEditForm({
                    ...editForm,
                    role: newRole,
                    departmentId: isCompany ? 1 : editForm.departmentId,
                  });
                }}
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">所属部门</label>
              <select
                className="rounded-full border-slate-200 bg-slate-50 h-10 px-4 w-full text-sm text-slate-600 mt-1"
                value={editForm.departmentId}
                disabled={['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'].includes(editForm.role)}
                onChange={(e) => setEditForm({ ...editForm, departmentId: Number(e.target.value) })}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">邮箱</label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="mt-1"
                placeholder="可选"
              />
            </div>

            <div>
              <label className="text-sm font-medium">电话</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="mt-1"
                placeholder="可选"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="mr-2"
                />
                启用状态
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button className="rounded-full" onClick={handleEditUser}>
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
