'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchAndPagination } from '@/hooks/use-search-pagination';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { isCompanyLevel } from '@/features/users/domain/role.rules';
import { getDepartments } from '@/features/departments/client/department-api';
import { getVisibleWorks, queryWorks } from '@/features/works/client/work-api';
import type { Work } from '@/features/works/client/work-view.types';
import type { WorkType, WorkStatusFilter } from '@/features/works/domain/work-client.types';
import { workTypeColors, getStatusAccent } from '@/features/works/ui/status-colors';
import { Plus, Download, Upload, FileSpreadsheet, Star, ListTodo, CheckSquare } from 'lucide-react';
import { WorkListToolbar } from '@/features/works/ui/work-list-toolbar';
import { PriorityMainWorkListItem } from '@/features/works/ui/priority-main-work-list-item';
import { TodoWorkListItem } from '@/features/works/ui/todo-work-list-item';
import { WorkListPagination } from '@/features/works/ui/work-list-pagination';

const pillButton = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:-translate-y-0.5 transition-all';

export default function ItemListPage() {
  const params = useParams<{ type: string }>();
  const routeType = params?.type || 'todo';
  const { user } = useAuth();
  const [items, setItems] = useState<Work[]>([]);
  const [keyword, setKeyword] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | '全部'>('全部');
  const [statusFilter, setStatusFilter] = useState<WorkStatusFilter>('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code: string; isBusiness: boolean }>>([]);
  const companyLevel = isCompanyLevel(user?.role, user?.departmentId);

  useEffect(() => {
    const fetchDepartments = async () => {
      const depts = await getDepartments();
      setDepartments(depts);
    };
    fetchDepartments();
  }, []);

  const type = routeType === 'priority' ? '重点' : routeType === 'main' ? '主要' : '待办';
  const isPriorityOrMain = type === '重点' || type === '主要';

  const load = async () => {
    const data = await getVisibleWorks(user, type);
    setItems(data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, type]);

  const titleMap: Record<WorkType, string> = {
    重点: '重点工作',
    主要: '主要工作',
    待办: '待办事项',
  };

  const routeKey = routeType === 'priority' ? 'priority' as const : routeType === 'main' ? 'main' as const : 'todo' as const;
  const c = workTypeColors[routeKey];
  const accentBar = routeType === 'priority' ? 'bg-rose-500' : routeType === 'main' ? 'bg-sky-500' : 'bg-emerald-500';
  const iconColor = routeType === 'priority' ? 'text-rose-500' : routeType === 'main' ? 'text-sky-500' : 'text-emerald-500';
  const TitleIcon = routeType === 'priority' ? Star : routeType === 'main' ? ListTodo : CheckSquare;

  const canCreate =
    type === '待办'
      ? (
          user?.role === 'ADMIN' ||
          user?.role === 'DEPARTMENT_MANAGER' ||
          user?.role === 'DEPARTMENT_LEADER' ||
          user?.role === 'VICE_PRESIDENT' ||
          user?.role === 'PRESIDENT' ||
          user?.role === 'SUPERVISOR'
        )
      : (
          user?.role === 'ADMIN' ||
          user?.role === 'DEPARTMENT_MANAGER' ||
          user?.role === 'DEPARTMENT_LEADER' ||
          user?.role === 'SUPERVISOR'
        );

  const getWorkMonth = (work: Work) => {
    const date = work.planCompleteTime || '';
    if (!date) return '';
    return String(date).slice(0, 7);
  };

  const getMonthLabel = (month: string) => {
    if (!month) return '';
    const [year, m] = month.split('-');
    return `${year}年${Number(m)}月`;
  };

  const monthOptions = Array.from(
    new Set(
      items
        .map((work) => getWorkMonth(work))
        .filter(Boolean)
    )
  ).sort();

  const [list, setList] = useState<Work[]>([]);

  useEffect(() => {
    const fetchList = async () => {
      const data = await queryWorks(user, {
        type,
        departmentId: companyLevel ? departmentFilter : user?.departmentId,
        status: statusFilter,
        keyword,
      });
      setList(data);
    };
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, type, departmentFilter, statusFilter, keyword]);

  const filteredList = useMemo(() => {
    if (monthFilter) {
      return list.filter((work) => getWorkMonth(work) === monthFilter);
    }
    return list;
  }, [list, monthFilter]);

  const { list: pagedList, total, totalPages, page, setPage, pageSize, setPageSize } =
    useSearchAndPagination(filteredList, '', [keyword, departmentFilter, statusFilter, monthFilter, type]);

  const getDepartmentName = (id: number) => {
    return departments.find((d) => d.id === id)?.name || '-';
  };

  const handleExport = async () => {
    const params = new URLSearchParams();
    params.set('type', routeType);
    if (keyword) params.set('keyword', keyword);
    if (departmentFilter !== '全部') params.set('departmentId', String(departmentFilter));
    if (statusFilter !== 'all') params.set('status', statusFilter);

    try {
      const res = await fetch(`/api/excel/export?${params.toString()}`, { credentials: 'include' });
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

  const handleReset = () => {
    setKeyword('');
    setMonthFilter('');
    setDepartmentFilter('全部');
    setStatusFilter('all');
    load();
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/excel/import/${routeType}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '导入失败');
      } else {
        alert('导入成功');
        load();
      }
    } catch {
      alert('导入失败');
    }

    e.target.value = '';
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`/api/excel/template/${routeType}`, { credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '下载模板失败' }));
        alert(err.error || '下载模板失败');
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
      alert('下载模板失败，请检查网络连接');
    }
  };

  return (
    <div className="space-y-6">
      <div className="stagger-1 flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
          <span className={`w-1 h-6 rounded-full ${accentBar}`} />
          <TitleIcon className={`h-6 w-6 ${iconColor}`} />
          {titleMap[type]}
        </h1>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className={pillButton}>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            下载模板
          </button>
          <button onClick={() => importInputRef.current?.click()} className={pillButton}>
            <Upload className="h-3.5 w-3.5" />
            导入
          </button>
          <button onClick={handleExport} className={pillButton}>
            <Download className="h-3.5 w-3.5" />
            导出
          </button>
          {canCreate && (
            <Link href={`/${routeType}/new`} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium hover:-translate-y-0.5 transition-all ${c.button}`}>
              <Plus className="h-3.5 w-3.5" />
              新建{titleMap[type]}
            </Link>
          )}
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportExcel}
      />

      <WorkListToolbar
        keyword={keyword}
        onKeywordChange={setKeyword}
        monthFilter={monthFilter}
        onMonthFilterChange={setMonthFilter}
        monthOptions={monthOptions}
        getMonthLabel={getMonthLabel}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        departments={departments}
        companyLevel={companyLevel}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onReset={handleReset}
        onRefresh={load}
      />

      <div className="stagger-2 text-sm text-slate-500">
        当前共筛选出 {total} 项{titleMap[type]}，当前第 {page} / {totalPages} 页
      </div>

      <div className="stagger-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        {total === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">暂无{titleMap[type]}</div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {pagedList.map((item) => (
                <div key={item.id} className={`p-4 ${getStatusAccent(item.status)}`}>
                  {isPriorityOrMain ? (
                    <PriorityMainWorkListItem
                      item={item}
                      routeType={routeType}
                      getDepartmentName={getDepartmentName}
                    />
                  ) : (
                    <TodoWorkListItem
                      item={item}
                      routeType={routeType}
                      getDepartmentName={getDepartmentName}
                    />
                  )}
                </div>
              ))}
            </div>
            <WorkListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
