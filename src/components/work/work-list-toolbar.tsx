'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  onReset,
  onRefresh,
}: WorkListToolbarProps) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="搜索事项名称..."
            className="pl-10"
          />
        </div>

        <select
          value={monthFilter}
          onChange={(e) => onMonthFilterChange(e.target.value)}
          className="border rounded-md h-10 px-3"
        >
          <option value="">全部月份</option>
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {getMonthLabel(month)}
            </option>
          ))}
        </select>

        {companyLevel && (
          <select
            value={departmentFilter}
            onChange={(e) =>
              onDepartmentFilterChange(e.target.value === '全部' ? '全部' : Number(e.target.value))
            }
            className="border rounded-md h-10 px-3"
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

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as WorkStatusFilter)}
          className="border rounded-md h-10 px-3"
        >
          <option value="all">全部状态</option>
          <option value="approving">待审批</option>
          <option value="inProgress">进行中</option>
          <option value="completed">已完成</option>
          <option value="rejected">已退回</option>
          <option value="cancelled">已取消</option>
          <option value="overdue">超期</option>
        </select>

        <Button variant="outline" onClick={onReset}>
          重置
        </Button>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新
        </Button>
      </CardContent>
    </Card>
  );
}