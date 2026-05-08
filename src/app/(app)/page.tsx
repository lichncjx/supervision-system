'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getVisibleWorks,
  canHandleWork,
  canApproveWork,
  canProcessWork,
  isExpiringWork,
  isOverdueWork,
  sortWorksByDueDate,
  isSupervisorTrackingWork,
  type Work,
} from '@/lib/work-store';
import { StatusBadge } from '@/components/common/badges';
import { isSupervisionAdmin } from '@/lib/auth';

export default function DashboardPage() {
  const NOTICE_KEY = 'supervision_admin_notice';
  const { user } = useAuth();
  const [adminNotice, setAdminNotice] = useState('');
  const [noticeDraft, setNoticeDraft] = useState('');
  const [noticeEditing, setNoticeEditing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    approving: 0,
    handling: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    expiring: 0,
    priority: 0,
    main: 0,
    todo: 0,
    priorityCompleted: 0,
    mainCompleted: 0,
    todoCompleted: 0,
  });
  const [visibleWorks, setVisibleWorks] = useState<Work[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(NOTICE_KEY) || '';
    setAdminNotice(saved);
    setNoticeDraft(saved);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const newWorks = await getVisibleWorks(user);
        setVisibleWorks(newWorks);
        const overdue = newWorks.filter((w) => isOverdueWork(w)).length;
        const expiring = newWorks.filter((w) => isExpiringWork(w)).length;

        const response = await fetch('/api/dashboard/summary', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setStats({
            total: data.priorityTotal + data.mainTotal + data.todoTotal,
            approving: data.approving,
            handling: data.handling,
            inProgress: data.inProgress,
            completed: data.completed,
            overdue,
            expiring,
            priority: data.priorityTotal,
            main: data.mainTotal,
            todo: data.todoTotal,
            priorityCompleted: data.priorityCompleted ?? 0,
            mainCompleted: data.mainCompleted ?? 0,
            todoCompleted: data.todoCompleted ?? 0,
          });
        } else {
          setStats((prev) => ({ ...prev, overdue, expiring }));
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };
    loadData();
  }, [user]);

  const saveNotice = () => {
    localStorage.setItem(NOTICE_KEY, noticeDraft);
    setAdminNotice(noticeDraft);
    setNoticeEditing(false);
    alert('督办提示已保存');
  };

  const handleExportCompletionRate = async () => {
    try {
      const res = await fetch('/api/excel/completion-rate', { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '导出失败' }));
        alert(err.error || '导出失败');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('导出失败，请检查网络连接');
    }
  };

  const canEditNotice = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const canCreateWork =
    user?.role === 'ADMIN' ||
    user?.role === 'DEPARTMENT_MANAGER' ||
    user?.role === 'DEPARTMENT_LEADER' ||
    user?.role === 'SUPERVISOR';

  const canCreateTodo =
    user?.role === 'ADMIN' ||
    user?.role === 'DEPARTMENT_MANAGER' ||
    user?.role === 'DEPARTMENT_LEADER' ||
    user?.role === 'VICE_PRESIDENT' ||
    user?.role === 'PRESIDENT' ||
    user?.role === 'SUPERVISOR';

  const pendingProcesses = sortWorksByDueDate(
    visibleWorks.filter((work) =>
      user?.role === 'SUPERVISOR'
        ? isSupervisorTrackingWork(work)
        : canProcessWork(user, work)
    )
  ).slice(0, 5);

  const alertWorks = sortWorksByDueDate(visibleWorks.filter((work) => isExpiringWork(work) || isOverdueWork(work)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between stagger-1">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {user ? `欢迎回来，${user.name}` : '欢迎使用公司督办管理系统'}
          </h2>
        </div>

        <div className="flex gap-2">
          {canCreateWork && (
            <>
              <Link href="/priority/new" className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100 hover:-translate-y-0.5 transition-all">
                <Plus className="h-3.5 w-3.5" />
                重点工作
              </Link>
              <Link href="/main/new" className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3.5 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-100 hover:-translate-y-0.5 transition-all">
                <Plus className="h-3.5 w-3.5" />
                主要工作
              </Link>
            </>
          )}
          {canCreateTodo && (
            <Link href="/todo/new" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100 hover:-translate-y-0.5 transition-all">
              <Plus className="h-3.5 w-3.5" />
              待办事项
            </Link>
          )}
        </div>
      </div>

      <div className="stagger-1 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-gray-900">督办提示</div>
            </div>

            {canEditNotice && !noticeEditing && (
              <Button size="sm" variant="outline" onClick={() => setNoticeEditing(true)}>
                编辑
              </Button>
            )}
          </div>

          {noticeEditing && canEditNotice ? (
            <div className="mt-3 space-y-3">
              <Textarea
                value={noticeDraft}
                onChange={(e) => setNoticeDraft(e.target.value)}
                rows={3}
                placeholder="请输入督办提示、工作要求或注意事项"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveNotice}>保存</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNoticeDraft(adminNotice);
                    setNoticeEditing(false);
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-lg bg-slate-50/80 p-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
              {adminNotice || '暂无督办提示'}
            </div>
          )}
        </div>

      <div className="stagger-2 flex flex-wrap items-center gap-2">
        <Link href="/status/approving" className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3.5 py-1.5 text-sm font-medium text-purple-700 border border-purple-100 hover:-translate-y-0.5 transition">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          待审批 <span className="tabular-nums font-bold">{stats.approving}</span>
        </Link>
        <Link href="/status/handling" className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1.5 text-sm font-medium text-indigo-700 border border-indigo-100 hover:-translate-y-0.5 transition">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          待办理 <span className="tabular-nums font-bold">{stats.handling}</span>
        </Link>
        <Link href="/status/inProgress" className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1.5 text-sm font-medium text-sky-700 border border-sky-100 hover:-translate-y-0.5 transition">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          进行中 <span className="tabular-nums font-bold">{stats.inProgress}</span>
        </Link>
        <Link href="/status/expiring" className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1.5 text-sm font-medium text-orange-700 border border-orange-100 hover:-translate-y-0.5 transition">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          临期 <span className="tabular-nums font-bold">{stats.expiring}</span>
        </Link>
        <Link href="/status/overdue" className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-1.5 text-sm font-medium text-rose-700 border border-rose-100 hover:-translate-y-0.5 transition">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          超期 <span className="tabular-nums font-bold">{stats.overdue}</span>
        </Link>
      </div>

      {isSupervisionAdmin(user?.role) && (
        <Card className="stagger-3">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">综合查询</div>
              <div className="text-sm text-gray-500">
                可按事项类型、责任部门、状态和关键词筛选全公司事项
              </div>
            </div>
            <div className="flex gap-2">
              {isSupervisionAdmin(user?.role) && (
                <Button
                  variant="outline"
                  onClick={handleExportCompletionRate}
                >
                  导出完成率
                </Button>
              )}

              <Link href="/status/all">
                <Button>进入综合查询</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="stagger-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            href: '/priority',
            label: '重点工作',
            total: stats.priority,
            completed: stats.priorityCompleted,
            color: 'rose' as const,
            gradient: 'from-red-50 to-rose-50/30',
            icon: '★',
          },
          {
            href: '/main',
            label: '主要工作',
            total: stats.main,
            completed: stats.mainCompleted,
            color: 'sky' as const,
            gradient: 'from-blue-50 to-sky-50/30',
            icon: '●',
          },
          {
            href: '/todo',
            label: '待办事项',
            total: stats.todo,
            completed: stats.todoCompleted,
            color: 'emerald' as const,
            gradient: 'from-emerald-50 to-teal-50/30',
            icon: '✓',
          },
        ].map(({ href, label, total, completed, color, gradient, icon }) => {
          const rate = total > 0 ? Math.round((completed / total) * 100) : 0
          const colorMap = {
            rose: { text: 'text-rose-600', progress: 'bg-rose-500', dot: 'bg-rose-500' },
            sky: { text: 'text-sky-600', progress: 'bg-sky-500', dot: 'bg-sky-500' },
            emerald: { text: 'text-emerald-600', progress: 'bg-emerald-500', dot: 'bg-emerald-500' },
          }
          const c = colorMap[color]

          return (
            <Link key={href} href={href} className="block group">
              <div className={`rounded-xl border border-slate-200/80 bg-gradient-to-br ${gradient} p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">{label}</span>
                  <span className={`text-lg ${c.text}`}>{icon}</span>
                </div>
                <p className={`text-4xl font-extrabold ${c.text} tabular-nums`}>{total}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 tabular-nums">{rate}%</span>
                  <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
                    <div className={`h-full rounded-full ${c.progress} transition-all`} style={{ width: `${rate}%` }} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  已完成 {completed}/{total}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="stagger-5 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-500 tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                待处理
              </h3>
              {(stats.approving + stats.handling) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold px-1.5 tabular-nums">
                  {stats.approving + stats.handling}
                </span>
              )}
            </div>
            <Link href="/process" className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors">
              查看全部 <span className="text-slate-400">→</span>
            </Link>
          </div>

          {pendingProcesses.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm">暂无待处理事项</div>
          ) : (
            <div className="space-y-2">
              {pendingProcesses.slice(0, 5).map((work) => {
                const borderColor = canApproveWork(user, work)
                  ? 'border-l-amber-400 bg-amber-50/30'
                  : canHandleWork(user, work)
                  ? 'border-l-purple-400 bg-purple-50/20'
                  : 'border-l-sky-400 bg-sky-50/20'
                return (
                  <Link key={work.id} href={`/${work.type === '重点' ? 'priority' : work.type === '主要' ? 'main' : 'todo'}/${work.id}`}>
                    <div className={`border-l-2 rounded-lg p-3 hover:translate-x-0.5 transition min-w-0 ${borderColor}`}>
                      <div className="text-sm font-medium text-slate-700 break-words leading-snug">{work.title}</div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
                        <span className="text-slate-400">{work.type}工作</span>
                        <StatusBadge status={work.status} />
                        {canApproveWork(user, work) && <span className="text-amber-600 font-medium text-xs">待审批</span>}
                        {canHandleWork(user, work) && <span className="text-purple-600 font-medium text-xs">待办理</span>}
                      </div>
                      {work.rejectReason && (
                        <div className="text-xs text-rose-600 mt-1.5 break-words bg-rose-50/50 rounded px-2 py-1">
                          退回人：{work.rejectedBy || '-'}；退回原因：{work.rejectReason}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="stagger-6 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-amber-50/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-500 tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
                临超期
              </h3>
              {(stats.expiring + stats.overdue) > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold px-1.5 tabular-nums">
                  {stats.expiring + stats.overdue}
                </span>
              )}
            </div>
            <Link href="/alert" className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 transition-colors">
              查看全部 <span className="text-slate-400">→</span>
            </Link>
          </div>

          {alertWorks.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm">暂无临超期事项</div>
          ) : (
            <div className="space-y-2">
              {alertWorks.slice(0, 5).map((work) => {
                const date = work.completeTime || work.planCompleteTime
                const borderColor = isOverdueWork(work)
                  ? 'border-l-rose-400 bg-rose-50/30'
                  : 'border-l-orange-400 bg-orange-50/20'
                return (
                  <Link key={work.id} href={`/${work.type === '重点' ? 'priority' : work.type === '主要' ? 'main' : 'todo'}/${work.id}`}>
                    <div className={`border-l-2 rounded-lg p-3 hover:translate-x-0.5 transition min-w-0 ${borderColor}`}>
                      <div className="text-sm font-medium text-slate-700 break-words leading-snug">{work.title}</div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">{work.type}工作</span>
                        <StatusBadge status={work.status} />
                        <span className="text-slate-400">计划完成：{date || '-'}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}