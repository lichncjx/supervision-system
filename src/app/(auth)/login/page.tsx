'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      router.replace('/');
      return;
    }

    setError(result.error || '登录失败');
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-gradient-to-br from-white to-slate-50/50 rounded-xl shadow-lg stagger-1">
        <div>
          <h1 className="text-2xl font-bold text-center text-slate-800">
            督办管理系统
          </h1>
          <p className="mt-2 text-center text-sm text-rose-500 font-medium">
            禁止上传涉密信息
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-rose-50/80 border border-rose-200 text-rose-600 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-600">
                用户名
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 focus:ring-slate-400 focus:border-slate-400"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-600">
                密码
              </label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 focus:ring-slate-400 focus:border-slate-400"
                  placeholder="请输入密码"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full rounded-full bg-slate-800 hover:bg-slate-900"
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </Button>

        </form>
      </div>
    </div>
  );
}