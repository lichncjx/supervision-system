'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface OperationLog {
  id: number;
  userId: number;
  userName: string;
  userRole: string;
  action: string;
  actionText: string;
  module: string;
  moduleText: string;
  targetId: number;
  targetType: string;
  description: string;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'create', label: '新增' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'import', label: '导入' },
  { value: 'export', label: '导出' },
  { value: 'upload', label: '上传' },
  { value: 'approve', label: '审批通过' },
  { value: 'reject', label: '审批退回' },
  { value: 'evidence', label: '提交见证材料' },
  { value: 'adjust', label: '申请调整' },
  { value: 'cancel', label: '申请取消' },
];

const MODULE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'works', label: '事项' },
  { value: 'workflow', label: '审批流' },
  { value: 'excel', label: 'Excel' },
  { value: 'attachment', label: '附件' },
  { value: 'user', label: '用户' },
  { value: 'auth', label: '认证' },
];

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // UI 显示用 "all"，实际业务用 ""
  const actionDisplayValue = actionFilter || 'all';
  const moduleDisplayValue = moduleFilter || 'all';

  const handleActionChange = (value: string) => {
    setActionFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  const handleModuleChange = (value: string) => {
    setModuleFilter(value === 'all' ? '' : value);
    setPage(1);
  };

  const canViewLogs = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR';

  const fetchLogs = async () => {
    if (!canViewLogs) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (actionFilter) params.set('action', actionFilter);
      if (moduleFilter) params.set('module', moduleFilter);
      if (keyword) params.set('keyword', keyword);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/operation-logs?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.items);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, moduleFilter, keyword, startDate, endDate]);

  const totalPages = Math.ceil(total / pageSize);

  if (!canViewLogs) {
    return (
      <div className="p-8 text-center text-red-600">
        无权限查看操作日志
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">操作日志</h1>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
        <h2 className="font-semibold text-slate-800 mb-4">筛选条件</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm text-slate-500 mb-1 block">操作类型</label>
              <Select value={actionDisplayValue} onValueChange={handleActionChange}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-500 mb-1 block">模块</label>
              <Select value={moduleDisplayValue} onValueChange={handleModuleChange}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  {MODULE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-500 mb-1 block">关键词</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="搜索描述..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-500 mb-1 block">开始日期</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-slate-500 mb-1 block">结束日期</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setActionFilter('');
                  setModuleFilter('');
                  setKeyword('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
              >
                重置
              </Button>
            </div>
          </div>
        </div>

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">操作人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">角色</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">模块</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">动作</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">描述</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      加载中...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{log.userName}</td>
                      <td className="px-4 py-3 text-sm">{log.userRole}</td>
                      <td className="px-4 py-3 text-sm">{log.moduleText}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 rounded-full text-xs">
                          {log.actionText}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm max-w-md truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{log.ipAddress || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
              <div className="text-sm text-slate-500">
                共 {total} 条记录，第 {page} / {totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}