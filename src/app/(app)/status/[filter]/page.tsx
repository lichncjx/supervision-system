'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getWorkDueDate,
  queryWorks,
  canHandleWork,
  canApproveWork,
  canProcessWork,
  sortWorksByDueDate,
  getVisibleWorks,
  isSupervisorTrackingWork,
  type WorkStatusFilter,
  type WorkType,
  type Work,
} from '@/lib/work-store';
import { getDepartments, isCompanyLevel, isSupervisionAdmin } from '@/lib/auth';
import { StatusBadge } from '@/components/common/badges';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type StatusPageFilter =
  | 'all'
  | 'pending'
  | 'processing'
  | 'process'
  | 'inProgress'
  | 'completed'
  | 'overdue'
  | 'expiring';

const allowedFilters: StatusPageFilter[] = [
  'all',
  'pending',
  'processing',
  'process',
  'inProgress',
  'completed',
  'overdue',
  'expiring',
];

const filterTitle: Record<StatusPageFilter, string> = {
  all: '全部事项',
  pending: '待我审批事项',
  processing: '待我办理事项',
  process: '待我处理事项',
  inProgress: '进行中事项',
  completed: '已完成事项',
  overdue: '超期事项',
  expiring: '临期事项',
};

function getRouteType(type: string) {
  if (type === '重点') return 'priority';
  if (type === '主要') return 'main';
  return 'todo';
}

const getWorkMonth = (work: any) => {
  const date = work.completeTime || work.planCompleteTime || work.due_date || '';
  if (!date) return '';
  return String(date).slice(0, 7);
};

const getMonthLabel = (month: string) => {
  if (!month) return '';
  const [year, m] = month.split('-');
  return `${year}年${Number(m)}月`;
};

export default function StatusFilterPage() {
  const params = useParams<{ filter: string }>();
  const filter = params?.filter || 'all';
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<WorkType | '全部'>('全部');
  const [departmentFilter, setDepartmentFilter] = useState<number | '全部'>('全部');
  const [keyword, setKeyword] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [monthOptions, setMonthOptions] = useState<string[]>([]);
  const [list, setList] = useState<Work[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code: string; isBusiness: boolean }>>([]);
  const companyLevel = isCompanyLevel(user?.role, user?.departmentId);

  const safeFilter: StatusPageFilter = allowedFilters.includes(filter as StatusPageFilter)
    ? (filter as StatusPageFilter)
    : 'all';

  const queryStatus =
    ['all', 'inProgress', 'completed', 'overdue', 'expiring'].includes(safeFilter)
      ? (safeFilter as WorkStatusFilter)
      : 'all';

  const getDepartmentName = (id: number) => {
    return departments.find((d) => d.id === id)?.name || '-';
  };

  React.useEffect(() => {
    const loadDepartments = async () => {
      const depts = await getDepartments();
      setDepartments(depts);
    };
    loadDepartments();
  }, []);

  React.useEffect(() => {
    const loadData = async () => {
      const visibleForMonthOptions = await getVisibleWorks(user);
      const newMonthOptions = Array.from(
        new Set(
          visibleForMonthOptions
            .map((work) => getWorkMonth(work))
            .filter(Boolean)
        )
      ).sort();
      setMonthOptions(newMonthOptions);

      const newList = await queryWorks(user, {
        type: typeFilter,
        departmentId: companyLevel ? departmentFilter : user?.departmentId,
        status: queryStatus,
        keyword,
      });

      let filteredList = newList;
      if (monthFilter) {
        filteredList = filteredList.filter((work) => getWorkMonth(work) === monthFilter);
      }

      if (safeFilter === 'pending') {
        filteredList = filteredList.filter((w) =>
          user?.role === 'SUPERVISOR'
            ? isSupervisorTrackingWork(w)
            : canApproveWork(user, w)
        );
      } else if (safeFilter === 'processing') {
        filteredList = filteredList.filter((w) =>
          user?.role === 'SUPERVISOR'
            ? isSupervisorTrackingWork(w)
            : canHandleWork(user, w)
        );
      } else if (safeFilter === 'process') {
        filteredList = filteredList.filter((w) =>
          user?.role === 'SUPERVISOR'
            ? isSupervisorTrackingWork(w)
            : canProcessWork(user, w)
        );
      }

      setList(sortWorksByDueDate(filteredList));
    };

    loadData();
  }, [user, typeFilter, departmentFilter, keyword, monthFilter, safeFilter, queryStatus, companyLevel]);

  const finalList = list;

  if (safeFilter === 'all' && user && !isSupervisionAdmin(user.role)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回首页
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">无权限访问</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            只有督办管理员可以访问综合查询页面
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{filterTitle[safeFilter]}</h1>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索事项名称..."
              className="max-w-sm"
            />

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="">全部月份</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as WorkType | '全部')}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="全部">全部类型</option>
              <option value="重点">重点工作</option>
              <option value="主要">主要工作</option>
              <option value="待办">待办事项</option>
            </select>

            {companyLevel && (
              <select
                value={departmentFilter}
                onChange={(e) =>
                  setDepartmentFilter(e.target.value === '全部' ? '全部' : Number(e.target.value))
                }
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="全部">全部部门</option>
                {departments
                  .filter((d) => d.id !== 1)
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>
            )}

            <Button
              variant="outline"
              onClick={() => {
                setKeyword('');
                setMonthFilter('');
                setTypeFilter('全部');
                setDepartmentFilter('全部');
              }}
            >
              重置
            </Button>
          </div>
          <div className="text-sm text-gray-500 mt-3">
            共 {list.length} 项
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {finalList.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              暂无{filterTitle[safeFilter]}
            </div>
          ) : (
            <div className="divide-y">
              {finalList.map((work) => (
                <div key={work.id} className="p-4 flex items-center justify-between hover:bg-gray-50 gap-4 min-w-0">
                  <div className="min-w-0">
                    <div className="font-medium break-words">
                      {work.title}
                      {work.isInnovation && (
                        <span className="ml-2 inline-flex items-center rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                          创新工作
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 mt-1 break-words">
                      类型：{work.type}　
                      状态：<StatusBadge status={work.status} />　
                      责任部门：{work.departmentIds && work.departmentIds.length > 0
                          ? work.departmentIds.map((id: number) => getDepartmentName(id)).join('、')
                          : getDepartmentName(work.departmentId ?? 0)}　
                      计划/完成时间：{getWorkDueDate(work) || '-'}
                    </div>

                    {work.progress && (
                      <div className="text-sm text-gray-600 mt-1 break-words whitespace-pre-wrap overflow-hidden">
                        进展情况：{work.progress}
                      </div>
                    )}
                  </div>

                  <Link href={`/${getRouteType(work.type)}/${work.id}`}>
                    <Button variant="outline" size="sm">
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