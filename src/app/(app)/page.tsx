'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { statusColors, expiryColors, workTypeColors } from '@/lib/status-colors';

const pillColors = { ...statusColors, ...expiryColors };
import { Textarea } from '@/components/ui/textarea';
import { Plus, Bell, Search } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { StatusBadge } from '@/components/common/badges';
import { isSupervisionAdmin } from '@/lib/auth';

type DashboardWorkType = 'PRIORITY' | 'MAIN' | 'TODO';

interface DashboardWorkItem {
  id: number;
  title: string;
  type: DashboardWorkType;
  typeLabel?: string;
  status: string;
  statusLabel?: string;
  completeTime: string | null;
  planCompleteTime: string | null;
  dueTime?: string | null;
  isOverdue: boolean;
  isExpiring: boolean;
  actionType: 'approval' | 'handling' | 'view';
}

function getDashboardWorkPath(work: DashboardWorkItem) {
  if (work.type === 'PRIORITY') return 'priority';
  if (work.type === 'MAIN') return 'main';
  return 'todo';
}

function getDashboardTypeKey(type: DashboardWorkType) {
  if (type === 'PRIORITY') return 'priority';
  if (type === 'MAIN') return 'main';
  return 'todo';
}

function getDashboardWorkDate(work: DashboardWorkItem) {
  return work.dueTime || work.completeTime || work.planCompleteTime || null;
}

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
  const [alertWorks, setAlertWorks] = useState<DashboardWorkItem[]>([]);
  const [pendingProcesses, setPendingProcesses] = useState<DashboardWorkItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(NOTICE_KEY) || '';
    setAdminNotice(saved);
    setNoticeDraft(saved);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/dashboard', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          const summary = data.summary || {};
          setStats({
            total: summary.total ?? ((summary.priorityTotal ?? 0) + (summary.mainTotal ?? 0) + (summary.todoTotal ?? 0)),
            approving: summary.pendingApprovalCount ?? summary.approving ?? 0,
            handling: summary.pendingHandlingCount ?? summary.handling ?? 0,
            inProgress: summary.inProgressCount ?? summary.inProgress ?? 0,
            completed: summary.completedCount ?? summary.completed ?? 0,
            overdue: summary.overdueCount ?? summary.overdue ?? 0,
            expiring: summary.expiringCount ?? summary.expiring ?? 0,
            priority: summary.priorityTotal ?? 0,
            main: summary.mainTotal ?? 0,
            todo: summary.todoTotal ?? 0,
            priorityCompleted: summary.priorityCompleted ?? 0,
            mainCompleted: summary.mainCompleted ?? 0,
            todoCompleted: summary.todoCompleted ?? 0,
          });
          setAlertWorks(data.lists?.expiringAndOverdue ?? []);
          setPendingProcesses(data.lists?.myActionRequired ?? []);
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
              <Link href="/priority/new" className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium hover:-translate-y-0.5 transition-all ${workTypeColors.priority.button}`}>
                <Plus className="h-3.5 w-3.5" />
                重点工作
              </Link>
              <Link href="/main/new" className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium hover:-translate-y-0.5 transition-all ${workTypeColors.main.button}`}>
                <Plus className="h-3.5 w-3.5" />
                主要工作
              </Link>
            </>
          )}
          {canCreateTodo && (
            <Link href="/todo/new" className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium hover:-translate-y-0.5 transition-all ${workTypeColors.todo.button}`}>
              <Plus className="h-3.5 w-3.5" />
              待办事项
            </Link>
          )}
        </div>
      </div>

      <div className="stagger-1 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50">
        <div className="flex items-start gap-4 p-4">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
            <Bell className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-slate-800">督办提示</div>
              {canEditNotice && !noticeEditing && (
                <button
                  onClick={() => setNoticeEditing(true)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  编辑
                </button>
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
                  <button onClick={saveNotice} className="inline-flex items-center rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-900 transition-colors">
                    保存
                  </button>
                  <button
                    onClick={() => { setNoticeDraft(adminNotice); setNoticeEditing(false); }}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                {adminNotice || <span className="text-slate-400">暂无督办提示</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {isSupervisionAdmin(user?.role) && (
        <div className="stagger-2 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50">
          <div className="flex items-center gap-4 p-4">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Search className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 text-sm">综合查询</div>
              <div className="text-xs text-slate-500 mt-0.5">按事项类型、责任部门、状态和关键词筛选全公司事项</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportCompletionRate}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                导出完成率
              </button>
              <Link
                href="/status/all"
                className="inline-flex items-center rounded-full bg-slate-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-900 transition-colors"
              >
                进入综合查询
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="stagger-3 flex flex-wrap items-center gap-2">
        {([
          { href: '/status/overdue', label: '超期', count: stats.overdue, key: 'overdue' as const },
          { href: '/status/expiring', label: '临期', count: stats.expiring, key: 'expiring' as const },
          { href: '/status/inProgress', label: '进行中', count: stats.inProgress, key: 'inProgress' as const },
          { href: '/status/handling', label: '待办理', count: stats.handling, key: 'handling' as const },
          { href: '/status/approving', label: '待审批', count: stats.approving, key: 'approving' as const },
        ]).map(({ href, label, count, key }) => (
          <Link key={key} href={href} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border hover:-translate-y-0.5 transition ${pillColors[key].pill}`}>
            <span className={`w-2 h-2 rounded-full ${pillColors[key].dot}`} />
            {label} <span className="tabular-nums font-bold">{count}</span>
          </Link>
        ))}
      </div>

      <div className="stagger-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {([
          { href: '/priority', label: '重点工作', total: stats.priority, completed: stats.priorityCompleted, key: 'priority' as const },
          { href: '/main', label: '主要工作', total: stats.main, completed: stats.mainCompleted, key: 'main' as const },
          { href: '/todo', label: '待办事项', total: stats.todo, completed: stats.todoCompleted, key: 'todo' as const },
        ]).map(({ href, label, total, completed, key }) => {
          const c = workTypeColors[key]
          const rate = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <Link key={href} href={href} className="block group">
              <div className={`rounded-xl border border-slate-200/80 bg-gradient-to-br ${c.gradient} p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">{label}</span>
                  <span className={`text-lg ${c.text}`}>{c.icon}</span>
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
        <div className="stagger-5 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-amber-50/20 p-5">
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
                const date = getDashboardWorkDate(work)
                const typeKey = getDashboardTypeKey(work.type)
                const typeColor = workTypeColors[typeKey]
                return (
                  <Link key={work.id} href={`/${getDashboardWorkPath(work)}/${work.id}`}>
                    <div className={`border-l-2 rounded-lg p-3 hover:translate-x-0.5 transition min-w-0 ${typeColor.left}`}>
                      <div className="text-sm font-medium text-slate-700 break-words leading-snug">{work.title}</div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${typeColor.text}`}>{work.typeLabel || work.type}</span>
                        <StatusBadge status={work.status} work={work} />
                        <span className="text-slate-400">计划完成时间：{date || '-'}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="stagger-6 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-500 tracking-wide flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
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
                const typeKey = getDashboardTypeKey(work.type)
                const typeColor = workTypeColors[typeKey]
                return (
                  <Link key={work.id} href={`/${getDashboardWorkPath(work)}/${work.id}`}>
                    <div className={`border-l-2 rounded-lg p-3 hover:translate-x-0.5 transition min-w-0 ${typeColor.left}`}>
                      <div className="text-sm font-medium text-slate-700 break-words leading-snug">{work.title}</div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${typeColor.text}`}>{work.typeLabel || work.type}</span>
                        <StatusBadge status={work.status} work={work} />
                        {work.actionType === 'approval' && <span className="text-purple-600 font-medium text-xs">待审批</span>}
                        {work.actionType === 'handling' && <span className="text-indigo-600 font-medium text-xs">待办理</span>}
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
