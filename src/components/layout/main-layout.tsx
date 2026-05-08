'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Star,
  ListTodo,
  CheckSquare,
  ClipboardCheck,
  Settings,
  User,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getRoleName, changePassword } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const navItems = [
  { href: '/', label: '首页', icon: LayoutDashboard },
  { href: '/priority', label: '重点工作', icon: Star, color: 'text-red-600' },
  { href: '/main', label: '主要工作', icon: ListTodo, color: 'text-blue-600' },
  { href: '/todo', label: '待办事项', icon: CheckSquare, color: 'text-green-600' },
  { href: '/process', label: '待我处理', icon: ClipboardCheck },
  { href: '/admin', label: '系统管理', icon: Settings, requireAdmin: true },
  { href: '/logs', label: '操作日志', icon: FileText, requireSupervisor: true },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const resetPasswordForm = () => {
    setPasswordForm({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowPassword({
      oldPassword: false,
      newPassword: false,
      confirmPassword: false,
    });
  };

  const handleChangePassword = async () => {
    if (!user) return;

    const oldPassword = passwordForm.oldPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('请完整填写原密码、新密码和确认密码');
      return;
    }

    if (newPassword.length < 6) {
      alert('新密码至少6位');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('两次输入的新密码不一致');
      return;
    }

    const result = await changePassword(oldPassword, newPassword);

    if (!result.success) {
      alert(result.error || '修改密码失败');
      return;
    }

    resetPasswordForm();
    setPasswordDialogOpen(false);
    alert('密码修改成功，请使用新密码登录');
    await logout();
    router.replace('/login');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">加载中...</div>;
  }

  if (!isAuthenticated && pathname !== '/login') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">正在跳转登录...</div>;
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.requireAdmin) return user?.role === 'ADMIN';
    if (item.requireSupervisor) return user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
   公司督办管理系统（禁止上传涉密信息）
 </h1>
          {user && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4" />
              <span className="text-sm">{user.name}</span>
              <Badge variant="outline">{getRoleName(user.role)}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
              >
                <KeyRound className="h-4 w-4 mr-1" />
                改密
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" />
                退出
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white border-t">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex gap-1 h-12">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 text-sm font-medium',
                      active
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', item.color)} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>修改密码</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">原密码</label>
                <div className="relative">
                  <Input
                    type={showPassword.oldPassword ? 'text' : 'password'}
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        oldPassword: e.target.value,
                      }))
                    }
                    placeholder="请输入原密码"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        oldPassword: !prev.oldPassword,
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {showPassword.oldPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">新密码</label>
                <div className="relative">
                  <Input
                    type={showPassword.newPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="请输入新密码（至少6位）"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        newPassword: !prev.newPassword,
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {showPassword.newPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">确认新密码</label>
                <div className="relative">
                  <Input
                    type={showPassword.confirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="请再次输入新密码"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => ({
                        ...prev,
                        confirmPassword: !prev.confirmPassword,
                      }))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    {showPassword.confirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetPasswordForm();
                  setPasswordDialogOpen(false);
                }}
              >
                取消
              </Button>
              <Button onClick={handleChangePassword}>确定修改</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}