import { useEffect, useMemo, useState } from 'react';
import type { Work } from '@/lib/work-store';

const SEARCH_FIELDS: (keyof Work)[] = [
  'title',
  'workItem',
  'businessCategory',
  'progress',
  'workPlan',
  'departmentName',
];

export function useSearchAndPagination(
  baseList: Work[],
  keyword: string,
  resetDeps: unknown[] = []
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const filteredList = useMemo(() => {
    if (!keyword.trim()) return baseList;
    const kw = keyword.trim();
    return baseList.filter((w) =>
      SEARCH_FIELDS.filter(Boolean).some((field) => {
        const v = w[field];
        return v != null && String(v).includes(kw);
      })
    );
  }, [baseList, keyword]);

  const total = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const list = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, page, pageSize]);

  return { list, total, totalPages, page, setPage, pageSize, setPageSize };
}
