'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LayoutDashboard, Clock, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getVisibleWorks,
  canHandleWork,
  canApproveWork,
  canProcessWork,
  isExpiringWork,
  sortWorksByDueDate,
  isSupervisorTrackingWork,
  type Work,
} from '@/lib/work-store';
import { StatusBadge } from '@/components/common/badges';
import { isCompanyLevel } from '@/lib/auth';

export default function DashboardPage() {
  const NOTICE_KEY = 'supervision_admin_notice';
  const { user } = useAuth();
  const [adminNotice, setAdminNotice] = useState('');
  const [noticeDraft, setNoticeDraft] = useState('');
  const [noticeEditing, setNoticeEditing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pendingApproval: 0,
    pendingHandle: 0,
    pendingProcess: 0,
    inProgress: 0,
    completed: 0,
    expired: 0,
    expiring: 0,
    priority: 0,
    main: 0,
    todo: 0,
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
        const response = await fetch('/api/dashboard/summary', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setStats({
            total: data.priorityTotal + data.mainTotal + data.todoTotal,
            pendingApproval: data.pendingApprove,
            pendingHandle: data.pendingHandle,
            pendingProcess: data.pendingProcess,
            inProgress: data.inProgress,
            completed: data.completed,
            expired: data.overdue,
            expiring: 0,
            priority: data.priorityTotal,
            main: data.mainTotal,
            todo: data.todoTotal,
          });
        }
        const newWorks = await getVisibleWorks(user);
        setVisibleWorks(newWorks);
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

  const companyLevel = isCompanyLevel(user?.role, user?.departmentId);

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

  const expiringWorks = visibleWorks.filter((work) => isExpiringWork(work)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {user ? `欢迎回来，${user.name}` : '欢迎使用公司督办管理系统'}
          </h2>
          <p className="text-gray-500 mt-1">实时跟踪和管理公司督办事项</p>
        </div>

        <div className="flex gap-2">
          {canCreateWork && (
            <>
              <Link href="/priority/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  重点工作
                </Button>
              </Link>
              <Link href="/main/new">
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  主要工作
                </Button>
              </Link>
            </>
          )}
          {canCreateTodo && (
            <Link href="/todo/new">
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                待办事项
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-gray-900">督办提示</div>
              <div className="text-sm text-gray-500">由督办管理员维护，所有用户可见</div>
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
            <div className="mt-3 rounded-md bg-blue-50 border border-blue-100 p-3 text-sm text-blue-900 whitespace-pre-wrap break-words">
              {adminNotice || '暂无督办提示'}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Link href="/status/all" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">总事项</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <LayoutDashboard className="h-6 w-6 text-gray-500" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/status/pending" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待我审批</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-600" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/status/processing" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">待我办理</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingHandle}</p>
              </div>
              <Clock className="h-6 w-6 text-purple-600" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/status/inProgress" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">进行中</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/status/completed" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/status/overdue" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">超期</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-red-600" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {companyLevel && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-900">综合查询</div>
              <div className="text-sm text-gray-500">
                可按事项类型、责任部门、状态和关键词筛选全公司事项
              </div>
            </div>
            <div className="flex gap-2">
              {(user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'VICE_PRESIDENT' || user?.role === 'PRESIDENT') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    window.location.href = '/api/excel/completion-rate';
                  }}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/priority" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-6">
              <p className="text-red-600 font-bold">重点工作</p>
              <p className="text-3xl font-bold mt-3">{stats.priority}</p>
              <p className="text-sm text-gray-500 mt-2">查看重点工作事项</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/main" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-6">
              <p className="text-blue-600 font-bold">主要工作</p>
              <p className="text-3xl font-bold mt-3">{stats.main}</p>
              <p className="text-sm text-gray-500 mt-2">查看主要工作事项</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/todo" className="block">
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardContent className="p-6">
              <p className="text-green-600 font-bold">待办事项</p>
              <p className="text-3xl font-bold mt-3">{stats.todo}</p>
              <p className="text-sm text-gray-500 mt-2">查看待办事项</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">近期到期</h3>
            </div>

            {expiringWorks.length === 0 ? (
              <div className="text-center text-gray-500 py-10">近期没有即将到期事项</div>
            ) : (
              <div className="space-y-3">
                {expiringWorks.slice(0, 5).map((work) => {
                  const date = work.completeTime || work.planCompleteTime;
                  return (
                    <Link key={work.id} href={`/${work.type === '重点' ? 'priority' : work.type === '主要' ? 'main' : 'todo'}/${work.id}`}>
                      <div className="border rounded-lg p-3 hover:bg-gray-50 min-w-0">
                        <div className="font-medium break-words">{work.title}</div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                          <span>{work.type}工作</span>
                          <StatusBadge status={work.status} />
                          <span>计划完成：{date || '-'}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">待我处理</h3>
              <Link href="/approval">
                <Button variant="link" size="sm">查看全部</Button>
              </Link>
            </div>

            {pendingProcesses.length === 0 ? (
              <div className="text-center text-gray-500 py-10">暂无待处理事项</div>
            ) : (
              <div className="space-y-3">
                {pendingProcesses.slice(0, 5).map((work) => (
                  <Link key={work.id} href={`/${work.type === '重点' ? 'priority' : work.type === '主要' ? 'main' : 'todo'}/${work.id}`}>
                    <div className="border rounded-lg p-3 hover:bg-gray-50 min-w-0">
                      <div className="font-medium break-words">{work.title}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <span>{work.type}工作</span>
                        <StatusBadge status={work.status} />
                        {canApproveWork(user, work) && <span className="text-yellow-600 font-medium">待审批</span>}
                        {canHandleWork(user, work) && <span className="text-purple-600 font-medium">待办理</span>}
                      </div>
                      {work.rejectReason && (
                        <div className="text-sm text-red-600 mt-1 break-words">
                          退回人：{work.rejectedBy || '-'}；退回原因：{work.rejectReason}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}