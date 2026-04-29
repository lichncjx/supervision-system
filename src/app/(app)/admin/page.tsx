'use client';

import { useState } from 'react';
import { Building, Settings, Users, Plus, Trash2, Power } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  addUser,
  deleteUser,
  departments,
  getDepartmentName,
  getRoleName,
  getUsers,
  updateUser,
  type Role,
  type User,
} from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminPage() {
  const { user } = useAuth();
  const [userList, setUserList] = useState<User[]>(getUsers());

  const [form, setForm] = useState({
    username: '',
    password: '123456',
    name: '',
    role: 'department_manager' as Role,
    department_id: 2,
  });

  if (!user || user.role !== 'admin') {
    return <div className="p-8 text-center text-red-600">无权限访问系统管理</div>;
  }

  const refresh = () => {
    setUserList(getUsers());
  };

  const handleAddUser = () => {
    try {
      if (!form.username.trim()) {
        alert('请输入用户名');
        return;
      }
      if (!form.name.trim()) {
        alert('请输入姓名');
        return;
      }

      const companyRole =
        form.role === 'admin' ||
        form.role === 'supervisor' ||
        form.role === 'vice_president' ||
        form.role === 'president';

      addUser({
        username: form.username.trim(),
        password: form.password || '123456',
        name: form.name.trim(),
        role: form.role,
        department_id: companyRole ? 1 : Number(form.department_id),
        is_active: true,
      });

      setForm({
        username: '',
        password: '123456',
        name: '',
        role: 'department_manager',
        department_id: 2,
      });

      refresh();
      alert('用户创建成功');
    } catch (e) {
      alert((e as Error).message || '创建失败');
    }
  };

  const handleToggleActive = (u: User) => {
    updateUser(u.id, { is_active: !u.is_active });
    refresh();
  };

  const handleDelete = (u: User) => {
    try {
      if (!confirm(`确认删除用户：${u.name}？`)) return;
      deleteUser(u.id);
      refresh();
    } catch (e) {
      alert((e as Error).message || '删除失败');
    }
  };

  const roleOptions: { label: string; value: Role }[] = [
    { label: '系统管理员', value: 'admin' },
    { label: '督办管理员', value: 'supervisor' },
    { label: '部门主管', value: 'department_manager' },
    { label: '部门领导', value: 'department_leader' },
    { label: '公司主管领导（副总）', value: 'vice_president' },
    { label: '公司主要领导（一把手，兼主管领导）', value: 'president' },
  ];

  const isCompanyRole =
    form.role === 'admin' ||
    form.role === 'supervisor' ||
    form.role === 'vice_president' ||
    form.role === 'president';

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
            <Input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="默认123456"
            />
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
                  department_id:
                    e.target.value === 'admin' ||
                    e.target.value === 'supervisor' ||
                    e.target.value === 'vice_president' ||
                    e.target.value === 'president'
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
              value={form.department_id}
              disabled={isCompanyRole}
              onChange={(e) => setForm({ ...form, department_id: Number(e.target.value) })}
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
                    {!u.is_active && <span className="ml-2 text-red-600 text-sm">已停用</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    用户名：{u.username}　密码：{u.password}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline">{getRoleName(u.role)}</Badge>
                  <span className="text-sm text-gray-500">{getDepartmentName(u.department_id)}</span>

                  <Button size="sm" variant="outline" onClick={() => handleToggleActive(u)}>
                    <Power className="h-4 w-4 mr-1" />
                    {u.is_active ? '停用' : '启用'}
                  </Button>

                  <Button size="sm" variant="destructive" onClick={() => handleDelete(u)} disabled={u.id <= 6}>
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
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}