'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RefreshCw } from 'lucide-react';
import type { WorkStatusFilter } from '@/lib/work-store';

interface WorkListToolbarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  monthFilter: string;
  onMonthFilterChange: (value: string) => void;
  monthOptions: string[];
  getMonthLabel: (month: string) => string;
  departmentFilter: number | '全部';
  onDepartmentFilterChange: (value: number | '全部') => void;
  departments: Array<{ id: number; name: string; code: string; isBusiness: boolean }>;
  companyLevel: boolean;
  statusFilter: WorkStatusFilter;
  onStatusFilterChange: (value: WorkStatusFilter) => void;
  typeFilter?: string;
  onTypeFilterChange?: (value: string) => void;
  hideStatusFilter?: boolean;
  onReset: () => void;
  onRefresh: () => void;
}

export function WorkListToolbar({
  keyword,
  onKeywordChange,
  monthFilter,
  onMonthFilterChange,
  monthOptions,
  getMonthLabel,
  departmentFilter,
  onDepartmentFilterChange,
  departments,
  companyLevel,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  hideStatusFilter,
  onReset,
  onRefresh,
}: WorkListToolbarProps) {
  const selectTriggerClass = 'rounded-full border border-slate-200 h-10 px-4 text-sm text-slate-600 bg-slate-50';

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-4 flex flex-wrap items-center gap-2">
      <div className="relative w-[220px] shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索事项名称..."
          className="pl-10 rounded-full"
        />
      </div>

      <Select value={monthFilter} onValueChange={onMonthFilterChange}>
        <SelectTrigger className={selectTriggerClass}>
          <SelectValue placeholder="全部月份" />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((month) => (
            <SelectItem key={month} value={month}>{getMonthLabel(month)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {companyLevel && (
        <Select value={typeof departmentFilter === 'number' ? String(departmentFilter) : departmentFilter} onValueChange={(v) => onDepartmentFilterChange(v === '全部' ? '全部' : Number(v))}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="全部部门" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部部门</SelectItem>
            {departments.filter((d) => d.id !== 1).map((dept) => (
              <SelectItem key={dept.id} value={String(dept.id)}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {typeFilter !== undefined && onTypeFilterChange && (
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="全部">全部类型</SelectItem>
            <SelectItem value="重点">重点工作</SelectItem>
            <SelectItem value="主要">主要工作</SelectItem>
            <SelectItem value="待办">待办事项</SelectItem>
          </SelectContent>
        </Select>
      )}

      {!hideStatusFilter && (
        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as WorkStatusFilter)}>
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="returnedDraft">退回待修改</SelectItem>
            <SelectItem value="pendingDecompose">待分解</SelectItem>
            <SelectItem value="approving">审批中</SelectItem>
            <SelectItem value="handling">待办理</SelectItem>
            <SelectItem value="inProgress">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
            <SelectItem value="expiring">临期</SelectItem>
            <SelectItem value="overdue">超期</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button variant="outline" onClick={onReset} className="rounded-full">
        重置
      </Button>
      <Button variant="outline" onClick={onRefresh} className="rounded-full">
        <RefreshCw className="h-4 w-4 mr-2" />
        刷新
      </Button>
    </div>
  );
}
