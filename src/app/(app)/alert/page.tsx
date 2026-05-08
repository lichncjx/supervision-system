'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getDepartments } from '@/lib/auth';
import {
  getVisibleWorks,
  isExpiringWork,
  isOverdueWork,
  getActionName,
  sortWorksByDueDate,
  type Work,
} from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/badges';

export default function AlertPage() {
  const { user } = useAuth();
  const [works, setWorks] = useState<Work[]>([]);
  const [tab, setTab] = useState<'expiring' | 'overdue' | 'all'>('expiring');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code: string; isBusiness: boolean }>>([]);

  useEffect(() => {
    const loadDepartments = async () => {
      const depts = await getDepartments();
      setDepartments(depts);
    };
    loadDepartments();
  }, []);

  const load = async () => {
    const worksData = await getVisibleWorks(user);
    setWorks([...worksData]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  const expiring = sortWorksByDueDate(works.filter((w) => isExpiringWork(w)));
  const overdue = sortWorksByDueDate(works.filter((w) => isOverdueWork(w)));
  const list = tab === 'expiring' ? expiring : tab === 'overdue' ? overdue : works;

  const getRouteType = (work: Work) => {
    if (work.type === '重点') return 'priority';
    if (work.type === '主要') return 'main';
    return 'todo';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <AlertTriangle className="h-7 w-7" />
        临超期
      </h1>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab('expiring')} className={`px-4 py-2 ${tab === 'expiring' ? 'border-b-2 border-red-600 text-red-600' : ''}`}>
          临期（{expiring.length}）
        </button>
        <button onClick={() => setTab('overdue')} className={`px-4 py-2 ${tab === 'overdue' ? 'border-b-2 border-red-600 text-red-600' : ''}`}>
          超期（{overdue.length}）
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
                      部门：{departments.find((d) => d.id === work.departmentId)?.name || '-'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      计划/完成时间：{work.completeTime || work.planCompleteTime || '-'}
                    </div>
                    {work.rejectReason && (
                      <div className="text-sm text-red-600 mt-1 break-words whitespace-pre-wrap">
                        上次退回原因：{work.rejectReason}
                      </div>
                    )}
                  </div>

                  <Link href={`/${getRouteType(work)}/${work.id}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      查看
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
