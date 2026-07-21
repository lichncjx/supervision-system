'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { statusColors, expiryColors, workTypeColors } from '@/features/works/ui/status-colors';

const pillColors = { ...statusColors, ...expiryColors };
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Bell, Search, Settings } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { StatusBadge } from '@/features/works/ui/badges';
import { WorkTitle } from '@/features/works/ui/work-title';
import { isGlobalView } from '@/features/users/domain/role.rules';
import { getSystemSettings, updateSystemSettings, type SystemSettings } from '@/features/system-settings/client/system-settings-api';
import { resolveQueryAssessmentYear, saveQueryYearPreference } from '@/features/system-settings/client/query-year-preference';

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
  return work.dueTime || work.planCompleteTime || null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [adminNotice, setAdminNotice] = useState('');
  const [noticeDraft, setNoticeDraft] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [defaultYearDraft, setDefaultYearDraft] = useState(String(new Date().getFullYear()));
  const [settingsLoaded, setSettingsLoaded] = useState(false);
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
  const [assessmentYear, setAssessmentYear] = useState(String(new Date().getFullYear()));

  useEffect(() => {
    if (!user) return;
    getSystemSettings()
      .then((settings) => {
        setSystemSettings(settings);
        setAdminNotice(settings.dashboardNotice || '');
        setNoticeDraft(settings.dashboardNotice || '');
        setDefaultYearDraft(String(settings.defaultAssessmentYear));
        setAssessmentYear(String(resolveQueryAssessmentYear({ userId: user.id, defaultYear: settings.defaultAssessmentYear })));
      })
      .catch(() => undefined)
      .finally(() => setSettingsLoaded(true));
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !settingsLoaded) return;
      try {
        const response = await fetch(`/api/dashboard?year=${assessmentYear}`, { credentials: 'include' });
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
  }, [user, assessmentYear, settingsLoaded]);

  const saveNotice = async () => {
    try {
      const settings = await updateSystemSettings({
        defaultAssessmentYear: Number(defaultYearDraft),
        dashboardNotice: noticeDraft,
        updatedAt: systemSettings?.updatedAt || null,
      });
      setSystemSettings(settings);
      setAdminNotice(settings.dashboardNotice || '');
      setNoticeDraft(settings.dashboardNotice || '');
      setDefaultYearDraft(String(settings.defaultAssessmentYear));
      setSettingsOpen(false);
      alert('系统设置已保存');
    } catch (error) {
      alert(error instanceof Error ? error.message : '系统设置保存失败');
    }
  };

  const handleExportCompletionRate = async () => {
    try {
      const res = await fetch(`/api/excel/completion-rate?year=${assessmentYear}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '导出失败' }));
        alert(err.message || '导出失败');
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
          {canEditNotice && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1 rounded-full px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <Settings className="h-3.5 w-3.5" />
              系统设置
            </button>
          )}
          <Select value={assessmentYear} onValueChange={(year) => { setAssessmentYear(year); if (user) saveQueryYearPreference(user.id, year); }}>
            <SelectTrigger className="w-[108px] rounded-full bg-white">
              <SelectValue placeholder="年度" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index).map((year) => (
                <SelectItem key={year} value={String(year)}>{year}年度</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            </div>

            <div className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
              {adminNotice || <span className="text-slate-400">暂无督办提示</span>}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>系统设置</DialogTitle>
            <DialogDescription>统一设置默认管理年度和全员可见的督办提示。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>默认管理年度</span>
              <Input type="number" min="2000" max="2100" value={defaultYearDraft} onChange={(e) => setDefaultYearDraft(e.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>督办提示</span>
              <Textarea value={noticeDraft} onChange={(e) => setNoticeDraft(e.target.value)} rows={5} placeholder="请输入督办提示、工作要求或注意事项" />
            </label>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => { setNoticeDraft(adminNotice); setDefaultYearDraft(String(systemSettings?.defaultAssessmentYear || new Date().getFullYear())); setSettingsOpen(false); }} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">取消</button>
            <button type="button" onClick={() => void saveNotice()} className="inline-flex items-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white">保存</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isGlobalView(user?.role) && (
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
                href={`/status/all?assessmentYear=${assessmentYear}`}
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
          { href: `/status/overdue?assessmentYear=${assessmentYear}`, label: '超期', count: stats.overdue, key: 'overdue' as const },
          { href: `/status/expiring?assessmentYear=${assessmentYear}`, label: '临期', count: stats.expiring, key: 'expiring' as const },
          { href: `/status/inProgress?assessmentYear=${assessmentYear}`, label: '进行中', count: stats.inProgress, key: 'inProgress' as const },
          { href: `/status/handling?assessmentYear=${assessmentYear}`, label: '待办理', count: stats.handling, key: 'handling' as const },
          { href: `/status/approving?assessmentYear=${assessmentYear}`, label: '待审批', count: stats.approving, key: 'approving' as const },
        ]).map(({ href, label, count, key }) => (
          <Link key={key} href={href} className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium border hover:-translate-y-0.5 transition ${pillColors[key].pill}`}>
            <span className={`w-2 h-2 rounded-full ${pillColors[key].dot}`} />
            {label} <span className="tabular-nums font-bold">{count}</span>
          </Link>
        ))}
      </div>

      <div className="stagger-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {([
          { href: `/priority?assessmentYear=${assessmentYear}`, label: '重点工作', total: stats.priority, completed: stats.priorityCompleted, key: 'priority' as const },
          { href: `/main?assessmentYear=${assessmentYear}`, label: '主要工作', total: stats.main, completed: stats.mainCompleted, key: 'main' as const },
          { href: `/todo?assessmentYear=${assessmentYear}`, label: '待办事项', total: stats.todo, completed: stats.todoCompleted, key: 'todo' as const },
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
                到期提醒
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
                      <div className="text-sm font-medium text-slate-700 break-words leading-snug"><WorkTitle work={work} /></div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${typeColor.text}`}>{work.typeLabel || work.type}</span>
                        <StatusBadge status={work.status} work={work} />
                        <span className="text-slate-400">完成时间：{date || '-'}</span>
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
                处理中心
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
                      <div className="text-sm font-medium text-slate-700 break-words leading-snug"><WorkTitle work={work} /></div>
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
