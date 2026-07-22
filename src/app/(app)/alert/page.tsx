'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchAndPagination } from '@/features/works/client/use-search-pagination';
import Link from 'next/link';
import { getWorkTypeAccent, getWorkTypeText } from '@/features/works/ui/status-colors';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getDepartments } from '@/features/departments/client/department-api';
import type { Department } from '@/features/departments/client/department-api';
import { queryWorks } from '@/features/works/client/work-api';
import type { Work } from '@/features/works/client/work-client.types';
import { StatusBadge } from '@/features/works/ui/badges';
import { WorkTitle } from '@/features/works/ui/work-title';
import { WorkListPagination } from '@/features/works/ui/work-list-pagination';
import { WorkSearchBar } from '@/features/works/ui/work-search-bar';

export default function AlertPage() {
  const { user } = useAuth();
  const [expiringWorks, setExpiringWorks] = useState<Work[]>([]);
  const [overdueWorks, setOverdueWorks] = useState<Work[]>([]);
  const [tab, setTab] = useState<'expiring' | 'overdue' | 'all'>('expiring');
  const [keyword, setKeyword] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const loadDepartments = async () => {
      const depts = await getDepartments();
      setDepartments(depts);
    };
    loadDepartments();
  }, []);

  const load = async () => {
    const [expiring, overdue] = await Promise.all([
      queryWorks({ status: 'expiring', assessmentYear: null }),
      queryWorks({ status: 'overdue', assessmentYear: null }),
    ]);
    setExpiringWorks(expiring);
    setOverdueWorks(overdue);
  };

  useEffect(() => {
    load();
  }, [user]);

  const expiringCount = expiringWorks.length;
  const overdueCount = overdueWorks.length;

  const allWorks = useMemo(() => {
    const seen = new Set<number>();
    const merged: Work[] = [];
    for (const w of [...expiringWorks, ...overdueWorks]) {
      if (!seen.has(w.id)) { seen.add(w.id); merged.push(w); }
    }
    return merged;
  }, [expiringWorks, overdueWorks]);

  const baseList = tab === 'expiring' ? expiringWorks : tab === 'overdue' ? overdueWorks : allWorks;

  const { list, total, totalPages, page, setPage, pageSize, setPageSize } =
    useSearchAndPagination(baseList, keyword, [tab, keyword]);

  if (!user) return null;

  const getRouteType = (work: Work) => {
    if (work.type === '重点') return 'priority';
    if (work.type === '主要') return 'main';
    return 'todo';
  };

  return (
    <div className="space-y-6">
      <h1 className="stagger-1 flex items-center gap-3 text-2xl font-bold text-slate-800">
        <span className="w-1 h-6 rounded-full bg-orange-500" />
        <AlertTriangle className="h-6 w-6 text-orange-500" />
        到期提醒
      </h1>

      <div className="stagger-2 flex rounded-full bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('expiring')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'expiring' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          临期（{expiringCount}）
        </button>
        <button
          onClick={() => setTab('overdue')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'overdue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          超期（{overdueCount}）
        </button>
        <button
          onClick={() => setTab('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          全部事项
        </button>
      </div>

      <WorkSearchBar keyword={keyword} onKeywordChange={setKeyword} total={total} page={page} totalPages={totalPages} />

      <div className="stagger-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
        {list.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">暂无数据</div>
        ) : (
          <>
            <div>
              {list.map((work) => {
                const borderClass = getWorkTypeAccent(work.type);

                return (
                  <Link
                    key={work.id}
                    href={`/${getRouteType(work)}/${work.id}`}
                    className={`list-separator block min-w-0 transition hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-orange-500/20 ${borderClass}`}
                  >
                    <div className="p-4">
                      <div className="text-sm font-semibold text-slate-700 break-words leading-snug"><WorkTitle work={work} /></div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${getWorkTypeText(work.type)}`}>{work.type}</span>
                        <StatusBadge status={work.status} work={work} />
                        <span className="text-slate-400">责任部门：{departments.find((d) => d.id === work.departmentId)?.name || '-'}</span>
                        <span className="text-slate-400">完成时间：{work.planCompleteTime || '-'}</span>
                      </div>
                      {work.rejectReason && (
                        <div className="mt-1.5 px-2 text-xs text-slate-500 break-words">
                          退回原因：{work.rejectReason}
                        </div>
                      )}
                    </div>

                  </Link>
                );
              })}
            </div>
            <WorkListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
