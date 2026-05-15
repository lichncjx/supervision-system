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
  AlertTriangle,
  Settings,
  User,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getRoleName } from '@/features/users/domain/role.rules';
import { changePassword } from '@/features/users/client/auth-api';
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
  { href: '/alert', label: '临超期', icon: AlertTriangle, color: 'text-orange-500' },
  { href: '/process', label: '待处理', icon: ClipboardCheck, color: 'text-purple-600' },
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
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">加载中...</div>;
  }

  if (!isAuthenticated && pathname !== '/login') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">正在跳转登录...</div>;
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.requireAdmin) return user?.role === 'ADMIN';
    if (item.requireSupervisor) return user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-teal-50/20">
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight leading-tight">
督办管理系统
          </h1>
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{user.name}</span>
                <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider border-teal-200 text-teal-700 bg-teal-50/50">
                  {getRoleName(user.role)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPasswordDialogOpen(true)}
                className="text-slate-500 hover:text-slate-700"
              >
                <KeyRound className="h-4 w-4 mr-1" />
                修改密码
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-slate-700">
                <LogOut className="h-4 w-4 mr-1" />
                退出
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-sm border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex gap-0.5 h-12 items-center">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
                      active
                        ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100/80'
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', active ? 'text-white/80' : item.color)} />
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