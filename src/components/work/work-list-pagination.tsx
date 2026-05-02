'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function WorkListPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: WorkListPaginationProps) {
  const handlePrev = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  return (
    <div className="flex items-center justify-between py-4">
      <div className="text-sm text-gray-500">
        共 {total} 条记录，当前第 {page} / {totalPages} 页
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">每页</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border rounded-md h-8 px-2 text-sm"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span className="text-sm text-gray-500">条</span>
        <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium w-8 text-center">{page}</span>
        <Button variant="outline" size="sm" onClick={handleNext} disabled={page === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}