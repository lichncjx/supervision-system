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
import { getWorkTypeAccent, getWorkTypeText } from '@/lib/status-colors';

type StatusPageFilter =
  | 'all'
  | 'approving'
  | 'handling'
  | 'inProgress'
  | 'completed'
  | 'overdue'
  | 'expiring';

const allowedFilters: StatusPageFilter[] = [
  'all',
  'approving',
  'handling',
  'inProgress',
  'completed',
  'overdue',
  'expiring',
];

const filterTitle: Record<StatusPageFilter, string> = {
  all: '全部事项',
  approving: '待我审批事项',
  handling: '待我办理事项',
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

const selectClass = 'rounded-full border border-slate-200 h-10 px-4 text-sm text-slate-600 bg-slate-50';

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

      if (safeFilter === 'approving') {
        filteredList = filteredList.filter((w) =>
          user?.role === 'SUPERVISOR'
            ? isSupervisorTrackingWork(w)
            : canApproveWork(user, w)
        );
      } else if (safeFilter === 'handling') {
        filteredList = filteredList.filter((w) =>
          user?.role === 'SUPERVISOR'
            ? isSupervisorTrackingWork(w)
            : canHandleWork(user, w)
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
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">无权限访问</h1>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-8 text-center text-slate-400 text-sm">
          只有督办管理员可以访问综合查询页面
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="stagger-1 flex items-center gap-4">
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{filterTitle[safeFilter]}</h1>
      </div>

      <div className="stagger-2 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索事项名称..."
            className="rounded-full"
          />

          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={selectClass}>
            <option value="">全部月份</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>{getMonthLabel(month)}</option>
            ))}
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as WorkType | '全部')} className={selectClass}>
            <option value="全部">全部类型</option>
            <option value="重点">重点工作</option>
            <option value="主要">主要工作</option>
            <option value="待办">待办事项</option>
          </select>

          {companyLevel && (
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value === '全部' ? '全部' : Number(e.target.value))} className={selectClass}>
              <option value="全部">全部部门</option>
              {departments.filter((d) => d.id !== 1).map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => { setKeyword(''); setMonthFilter(''); setTypeFilter('全部'); setDepartmentFilter('全部'); }}
            className="rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium transition-colors"
          >
            重置
          </button>
        </div>
        <div className="text-sm text-slate-500 mt-3">
          共 {list.length} 项
        </div>
      </div>

      <div className="stagger-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        {finalList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            暂无{filterTitle[safeFilter]}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {finalList.map((work) => (
              <div key={work.id} className={`flex items-start justify-between gap-4 min-w-0 rounded-lg hover:translate-x-0.5 transition ${getWorkTypeAccent(work.type)}`}>
                <div className="p-4 min-w-0">
                  <div className="text-sm font-medium text-slate-700 break-words leading-snug">
                    {work.title}
                    {work.isInnovation && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 text-xs font-medium">
                        创新工作
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${getWorkTypeText(work.type)}`}>{work.type}</span>
                    <StatusBadge status={work.status} />
                    <span className="text-slate-400">
                      责任部门：{work.departmentIds && work.departmentIds.length > 0
                        ? work.departmentIds.map((id: number) => getDepartmentName(id)).join('、')
                        : getDepartmentName(work.departmentId ?? 0)}
                    </span>
                    <span className="text-slate-400">计划完成时间：{getWorkDueDate(work) || '-'}</span>
                  </div>

                  {work.progress && (
                    <div className="text-xs text-slate-600 mt-1 break-words">
                      进展情况：{work.progress}
                    </div>
                  )}
                </div>

                <Link href={`/${getRouteType(work.type)}/${work.id}`} className="shrink-0 pr-4 py-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:-translate-y-0.5 transition-all">
                    <Eye className="h-3.5 w-3.5" />
                    查看
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
