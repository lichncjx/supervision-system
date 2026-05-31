'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PANEL_PADDED } from './visual-tokens';

interface WorkDraftActionsProps {
  isDraft: boolean;
  rejectReason?: string;
  editHref: string;
  onDelete: () => void;
}

export function WorkDraftActions({
  isDraft,
  rejectReason,
  editHref,
  onDelete,
}: WorkDraftActionsProps) {
  return (
    <div className={PANEL_PADDED}>
      <h3 className="text-sm font-semibold text-slate-500 tracking-wide mb-3">
        {isDraft ? '完善草稿' : '退回事项处理'}
      </h3>
      {isDraft && (
        <p className="text-sm text-slate-500 mb-3">
          可进入完整编辑页继续完善事项信息、上传附件后提交审批。
        </p>
      )}
      {!isDraft && rejectReason && (
        <div className="p-3 bg-rose-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap mb-3">
          退回原因：{rejectReason}
        </div>
      )}
      <div className="flex gap-2">
        <Link href={editHref} className="flex-1">
          <Button className="rounded-full w-full">
            <Pencil className="h-4 w-4" />
            {isDraft ? '编辑草稿' : '修改后重新提交'}
          </Button>
        </Link>
        <Button variant="destructive" onClick={onDelete} className="rounded-full flex-1">
          <Trash2 className="h-4 w-4" />
          {isDraft ? '删除草稿' : '删除退回事项'}
        </Button>
      </div>
    </div>
  );
}
