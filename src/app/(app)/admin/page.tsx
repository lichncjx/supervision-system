'use client';

import { useState, useEffect } from 'react';
import { Building, Settings, Users, Plus, Trash2, Power, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getRoleName, type Role } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">部门数量</p>
              <p className="text-3xl font-bold">{departments.length}</p>
            </div>
            <Building className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">用户数量</p>
              <p className="text-3xl font-bold">{userList.length}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">角色数量</p>
              <p className="text-3xl font-bold">6</p>
            </div>
            <Settings className="h-8 w-8 text-purple-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增用户账号</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="text-sm font-medium">姓名</label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：张三"
            />
          </div>

          <div>
            <label className="text-sm font-medium">用户名</label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="如：zhangsan"
            />
          </div>

          <div>
            <label className="text-sm font-medium">初始密码</label>
            <div className="relative">
              <Input
                type={showCreatePassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="默认123456"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowCreatePassword(!showCreatePassword)}
              >
                {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">角色</label>
            <select
              className="w-full border rounded-md h-10 px-3"
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

          <div>
            <label className="text-sm font-medium">所属部门</label>
            <select
              className="w-full border rounded-md h-10 px-3"
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

          <Button onClick={handleAddUser}>
            <Plus className="h-4 w-4 mr-1" />
            新增
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userList.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">
                    {u.name}
                    {!u.isActive && <span className="ml-2 text-red-600 text-sm">已停用</span>}
                    {u.isProtected && <Badge className="ml-2" variant="outline">内置账号</Badge>}
                  </p>
                  <p className="text-sm text-gray-500">
                    用户名：{u.username}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline">{getRoleName(u.role)}</Badge>
                  <span className="text-sm text-gray-500">{u.departmentName}</span>

                  <Button size="sm" variant="outline" onClick={() => openEditDialog(u)}>
                    编辑
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => openAdminPasswordDialog(u)}>
                    <KeyRound className="h-4 w-4 mr-1" />
                    修改密码
                  </Button>

                  <Button size="sm" variant="outline" onClick={() => handleToggleActive(u)}>
                    <Power className="h-4 w-4 mr-1" />
                    {u.isActive ? '停用' : '启用'}
                  </Button>

                  <Button size="sm" variant="destructive" onClick={() => handleDelete(u)} disabled={u.isProtected}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>部门列表（固定17个）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="p-4 border rounded-lg bg-gray-50">
                <p className="font-medium">{dept.name}</p>
                <p className="text-sm text-gray-500">
                  ID: {dept.id} / {dept.code}
                  {!dept.isBusiness && <span className="ml-2 text-gray-400">(非业务部门)</span>}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!passwordTarget} onOpenChange={(open) => !open && setPasswordTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">用户名</label>
              <p className="mt-1 text-sm text-gray-600">{passwordTarget?.name} ({passwordTarget?.username})</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                >
                  {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordTarget(null)}>
              取消
            </Button>
            <Button onClick={handleAdminChangePassword}>
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
              <p className="mt-1 text-sm text-gray-600">{editTarget?.username}</p>
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
                className="w-full border rounded-md h-10 px-3 mt-1"
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
                className="w-full border rounded-md h-10 px-3 mt-1"
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
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button onClick={handleEditUser}>
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
