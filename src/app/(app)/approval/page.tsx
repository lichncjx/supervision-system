'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { departments } from '@/lib/auth';
import {
  approveWork,
  canApproveWork,
  canHandleWork,
  getActionName,
  getVisibleWorks,
  rejectWork,
  sortWorksByDueDate,
  type Work,
} from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/badges';

export default function ApprovalPage() {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  const load = () => {
    setWorks([...getVisibleWorks(user)]);
  };

  useEffect(() => {
    load();
  }, [user]);

  if (!user) return null;

  const canEnter = !!user;

  if (!canEnter) {
    return <div className="p-8 text-center text-red-600">无权限访问待我处理</div>;
  }

  const pending = sortWorksByDueDate(works.filter((w) => canHandleWork(user, w)));
  const list = tab === 'pending' ? pending : works;

  const handleApprove = (work: Work) => {
    if (!user) return;
    approveWork(user, work);
    setWorks([...getVisibleWorks(user)]);
  };

  const handleReject = (work: Work) => {
    const reason = prompt('请输入退回原因：');
    if (reason === null) return;

    try {
      rejectWork(work, user, reason || '审批退回');
      setWorks([...getVisibleWorks(user)]);
      alert('已退回');
    } catch (error) {
      console.error(error);
      alert('退回失败，请查看控制台错误');
    }
  };

  const getRouteType = (work: Work) => {
    if (work.type === '重点') return 'priority';
    if (work.type === '主要') return 'main';
    return 'todo';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ClipboardCheck className="h-7 w-7" />
        待我处理
      </h1>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 ${tab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}>
          待我处理（{pending.length}）
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-2 ${tab === 'all' ? 'border-b-2 border-blue-600 text-blue-600' : ''}`}>
          全部事项
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="py-16 text-center text-gray-500">暂无数据</div>
          ) : (
            <div className="divide-y">
              {list.map((work) => (
                <div key={work.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{work.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      类型：{work.type}　
                      操作：{getActionName(work.action)}　
                      状态：<StatusBadge status={work.status} />　
                      部门：{departments.find((d) => d.id === work.department_id)?.name || '-'}
                    </div>
                    {work.type === '待办' && (
                      <div className="text-sm text-gray-500 mt-1">
                        事项提出领导：{work.proposed_leader || '-'}
                      </div>
                    )}
                    {work.adjust_reason && <div className="text-sm text-purple-600 mt-1">调整原因：{work.adjust_reason}</div>}
                    {work.adjust_new_time && (
                      <div className="text-sm text-purple-600 mt-1">
                        调整后时间：{work.adjust_new_time}
                      </div>
                    )}
                    {work.pending_adjustment_reason && (
                      <div className="text-sm text-purple-600 mt-1 break-words whitespace-pre-wrap">
                        调整原因：{work.pending_adjustment_reason}
                      </div>
                    )}

                    {work.pending_adjustment_from_time && (
                      <div className="text-sm text-purple-600 mt-1">
                        原计划完成时间：{work.pending_adjustment_from_time}
                      </div>
                    )}

                    {work.pending_adjustment_to_time && (
                      <div className="text-sm text-purple-600 mt-1">
                        现计划完成时间：{work.pending_adjustment_to_time}
                      </div>
                    )}

                    {work.approval_leader && (
                      <div className="text-sm text-blue-600 mt-1">
                        公司审批领导：{work.approval_leader}
                      </div>
                    )}

                    {work.reject_reason && (
                      <div className="text-sm text-red-600 mt-1 break-words whitespace-pre-wrap">
                        上次退回原因：{work.reject_reason}
                      </div>
                    )}
                    {work.pending_adjustment && (
                      <div className="text-sm text-gray-600 mt-1">
                        本次申请包含调整内容，请进入详情查看。
                      </div>
                    )}
                    {work.cancel_reason && <div className="text-sm text-gray-600 mt-1">取消原因：{work.cancel_reason}</div>}
                  </div>

                  <div className="flex gap-2">
                    {canApproveWork(user, work) && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(work)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          通过
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(work)}>
                          <XCircle className="h-4 w-4 mr-1" />
                          退回
                        </Button>
                      </>
                    )}

                    {!canApproveWork(user, work) && canHandleWork(user, work) && (
                      <Link href={`/${getRouteType(work)}/${work.id}`}>
                        <Button size="sm">处理</Button>
                      </Link>
                    )}

                    <Link href={`/${getRouteType(work)}/${work.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        查看
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}