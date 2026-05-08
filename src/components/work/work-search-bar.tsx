import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WorkSearchBarProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  total: number;
  page: number;
  totalPages: number;
}

export function WorkSearchBar({ keyword, onKeywordChange, total, page, totalPages }: WorkSearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索事项名称..."
          className="pl-9"
        />
      </div>
      <div className="text-sm text-gray-500">
        共 {total} 项，第 {page} / {totalPages} 页
      </div>
    </div>
  );
}
