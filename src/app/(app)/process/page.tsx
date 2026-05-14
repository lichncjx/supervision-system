'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchAndPagination } from '@/hooks/use-search-pagination';
import Link from 'next/link';
import { getWorkTypeAccent, getWorkTypeText } from '@/lib/status-colors';
import { ClipboardCheck, Eye, CheckCircle, XCircle, Play } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getDepartments } from '@/lib/auth';
import {
  approveWork,
  canApproveWork,
  canHandleWork,
  getWorkDueDate,
  queryWorks,
  rejectWork,
  type Work,
} from '@/lib/work-store';
import { StatusBadge } from '@/features/works/ui/badges';
import { WorkListPagination } from '@/features/works/ui/work-list-pagination';
import { WorkSearchBar } from '@/features/works/ui/work-search-bar';

export default function ApprovalPage() {
  const { user } = useAuth();
  const [approvingWorks, setApprovingWorks] = useState<Work[]>([]);
  const [handlingWorks, setHandlingWorks] = useState<Work[]>([]);
  const [tab, setTab] = useState<'approving' | 'handling' | 'all'>('approving');
  const [keyword, setKeyword] = useState('');
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code: string; isBusiness: boolean }>>([]);

  useEffect(() => {
    const loadDepartments = async () => {
      const depts = await getDepartments();
      setDepartments(depts);
    };
    loadDepartments();
  }, []);

  const load = async () => {
    const [approving, handling] = await Promise.all([
      queryWorks(user, { status: 'approving' } as any),
      queryWorks(user, { status: 'handling' } as any),
    ]);
    setApprovingWorks(approving);
    setHandlingWorks(handling);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const approvingCount = approvingWorks.length;
  const handlingCount = handlingWorks.length;

  const allWorks = useMemo(() => {
    const seen = new Set<number>();
    const merged: Work[] = [];
    for (const w of [...approvingWorks, ...handlingWorks]) {
      if (!seen.has(w.id)) { seen.add(w.id); merged.push(w); }
    }
    return merged;
  }, [approvingWorks, handlingWorks]);

  const baseList = tab === 'approving' ? approvingWorks : tab === 'handling' ? handlingWorks : allWorks;

  const { list, total, totalPages, page, setPage, pageSize, setPageSize } =
    useSearchAndPagination(baseList, keyword, [tab, keyword]);

  if (!user) return null;

  const handleApprove = async (work: Work) => {
    if (!user) return;
    await approveWork(user, work);
    await load();
  };

  const handleReject = async (work: Work) => {
    const reason = prompt('请输入退回原因：');
    if (reason === null) return;

    try {
      await rejectWork(work, user, reason || '审批退回');
      await load();
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
      <h1 className="stagger-1 flex items-center gap-3 text-2xl font-bold text-slate-800">
        <span className="w-1 h-6 rounded-full bg-purple-500" />
        <ClipboardCheck className="h-6 w-6 text-purple-500" />
        待我处理
      </h1>

      <div className="stagger-2 flex rounded-full bg-slate-100 p-1 w-fit">
        <button
          onClick={() => setTab('approving')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'approving' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          待我审批（{approvingCount}）
        </button>
        <button
          onClick={() => setTab('handling')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            tab === 'handling' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          待我办理（{handlingCount}）
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
            <div className="divide-y divide-slate-100">
              {list.map((work) => {
                const borderClass = getWorkTypeAccent(work.type);

                return (
                  <div key={work.id} className={`flex items-start justify-between hover:translate-x-0.5 transition min-w-0 ${borderClass}`}>
                    <div className="p-4 min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-700 break-words leading-snug">{work.title}</div>
                      <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${getWorkTypeText(work.type)}`}>{work.type}</span>
                        <StatusBadge status={work.status} work={work} />
                        <span className="text-slate-400">责任部门：{departments.find((d) => d.id === work.departmentId)?.name || '-'}</span>
                        <span className="text-slate-400">计划完成时间：{getWorkDueDate(work) || '-'}</span>
                      </div>
                      {work.type === '待办' && (
                        <div className="text-xs text-slate-500 mt-1">
                          事项提出领导：{work.proposedLeader || '-'}
                        </div>
                      )}
                      {work.adjustReason && <div className="text-xs text-purple-600 mt-1.5 bg-purple-50/50 rounded px-2 py-1">调整原因：{work.adjustReason}</div>}
                      {work.adjustNewTime && (
                        <div className="text-xs text-purple-600 mt-1">调整后时间：{work.adjustNewTime}</div>
                      )}
                      {work.pendingAdjustmentReason && (
                        <div className="text-xs text-purple-600 mt-1 break-words bg-purple-50/50 rounded px-2 py-1">
                          调整原因：{work.pendingAdjustmentReason}
                        </div>
                      )}
                      {work.pendingAdjustmentFromTime && (
                        <div className="text-xs text-purple-600 mt-1">原计划完成时间：{work.pendingAdjustmentFromTime}</div>
                      )}
                      {work.pendingAdjustmentToTime && (
                        <div className="text-xs text-purple-600 mt-1">现计划完成时间：{work.pendingAdjustmentToTime}</div>
                      )}
                      {work.approvalLeader && (
                        <div className="text-xs text-sky-600 mt-1">公司审批领导：{work.approvalLeader}</div>
                      )}
                      {work.rejectReason && (
                        <div className="text-xs text-rose-600 mt-1.5 break-words bg-rose-50/50 rounded px-2 py-1">
                          上次退回原因：{work.rejectReason}
                        </div>
                      )}
                      {work.pendingAdjustment && (
                        <div className="text-xs text-slate-600 mt-1">本次申请包含调整内容，请进入详情查看。</div>
                      )}
                      {work.cancelReason && <div className="text-xs text-slate-500 mt-1">取消原因：{work.cancelReason}</div>}
                    </div>

                    <div className="flex gap-2 p-4 shrink-0">
                      {canApproveWork(user!, work) && (
                        <>
                          <button onClick={() => handleApprove(work)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:bg-emerald-100 hover:-translate-y-0.5 transition-all">
                            <CheckCircle className="h-3.5 w-3.5" />
                            通过
                          </button>
                          <button onClick={() => handleReject(work)} className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100 hover:-translate-y-0.5 transition-all">
                            <XCircle className="h-3.5 w-3.5" />
                            退回
                          </button>
                        </>
                      )}

                      {!canApproveWork(user!, work) && canHandleWork(user!, work) && (
                        <Link href={`/${getRouteType(work)}/${work.id}`}>
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-100 hover:-translate-y-0.5 transition-all">
                            <Play className="h-3.5 w-3.5" />
                            处理
                          </span>
                        </Link>
                      )}

                      <Link href={`/${getRouteType(work)}/${work.id}`}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:-translate-y-0.5 transition-all">
                          <Eye className="h-3.5 w-3.5" />
                          查看
                        </span>
                      </Link>
                    </div>
                  </div>
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
