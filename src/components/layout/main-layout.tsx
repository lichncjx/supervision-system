'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Star, ListTodo, CheckSquare, ClipboardCheck, Settings, User, LogOut } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getRoleName } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: '首页', icon: LayoutDashboard },
  { href: '/priority', label: '重点工作', icon: Star, color: 'text-red-600' },
  { href: '/main', label: '主要工作', icon: ListTodo, color: 'text-blue-600' },
  { href: '/todo', label: '待办事项', icon: CheckSquare, color: 'text-green-600' },
  { href: '/approval', label: '待我处理', icon: ClipboardCheck },
  { href: '/admin', label: '系统管理', icon: Settings, requireAdmin: true },
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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">加载中...</div>;
  }

  if (!isAuthenticated && pathname !== '/login') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">正在跳转登录...</div>;
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.requireAdmin) return user?.role === 'admin';
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
    </div>
  );
}