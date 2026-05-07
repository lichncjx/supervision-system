'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { isCompanyLevel, getDepartments } from '@/lib/auth';
import { getVisibleWorks, queryWorks, type Work, type WorkType, type WorkStatusFilter } from '@/lib/work-store';
import { Plus, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { WorkListToolbar } from '@/components/work/work-list-toolbar';
import { PriorityMainWorkListItem } from '@/components/work/priority-main-work-list-item';
import { TodoWorkListItem } from '@/components/work/todo-work-list-item';
import { WorkListPagination } from '@/components/work/work-list-pagination';

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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const colorMap: Record<WorkType, string> = {
    重点: 'text-red-600',
    主要: 'text-blue-600',
    待办: 'text-green-600',
  };

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
    const date = work.completeTime || work.planCompleteTime || '';
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

  useEffect(() => {
    setPage(1);
  }, [keyword, departmentFilter, statusFilter, monthFilter, type]);

  const filteredList = useMemo(() => {
    if (monthFilter) {
      return list.filter((work) => getWorkMonth(work) === monthFilter);
    }
    return list;
  }, [list, monthFilter]);

  const total = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredList.slice(start, end);
  }, [filteredList, page, pageSize]);

  const getDepartmentName = (id: number) => {
    return departments.find((d) => d.id === id)?.name || '-';
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    params.set('type', routeType);
    if (keyword) params.set('keyword', keyword);
    if (departmentFilter !== '全部') params.set('departmentId', String(departmentFilter));
    if (statusFilter !== 'all') params.set('status', statusFilter);
    window.location.href = `/api/excel/export?${params.toString()}`;
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
      a.download = ''; // 由 Content-Disposition 决定文件名
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
      <div className="flex items-center justify-between">
        <h1 className={`text-2xl font-bold ${colorMap[type]}`}>{titleMap[type]}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            下载模板
          </Button>
          <Button variant="outline" onClick={() => importInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            导入
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            导出
          </Button>
          {canCreate && (
            <Link href={`/${routeType}/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建{titleMap[type]}
              </Button>
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

      <div className="text-sm text-gray-500">
        当前共筛选出 {total} 项{titleMap[type]}，当前第 {page} / {totalPages} 页
      </div>

      <Card>
        <CardContent className="p-0">
          {total === 0 ? (
            <div className="py-16 text-center text-gray-500">暂无{titleMap[type]}</div>
          ) : (
            <>
              <div className="divide-y">
                {pagedList.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
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
        </CardContent>
      </Card>
    </div>
  );
}