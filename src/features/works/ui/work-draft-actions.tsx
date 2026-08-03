'use client';

import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PANEL_PADDED } from './visual-tokens';

interface WorkDraftActionsProps {
  isDraft: boolean;
  rejectReason?: string;
  editHref: string;
  canEdit: boolean;
  canDelete: boolean;
  deleteDisabledReason?: string;
  onDelete: () => void;
}

export function WorkDraftActions({
  isDraft,
  rejectReason,
  editHref,
  canEdit,
  canDelete,
  deleteDisabledReason,
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
        <div className="mb-3 px-2 text-sm text-slate-600 break-words whitespace-pre-wrap">
          退回原因：{rejectReason}
        </div>
      )}
      <div className="flex gap-2">
        {canEdit && (
          <Link href={editHref} className="flex-1">
            <Button className="rounded-full w-full">
              <Pencil className="h-4 w-4" />
              {isDraft ? '编辑草稿' : '修改后重新提交'}
            </Button>
          </Link>
        )}
        {(canDelete || deleteDisabledReason) && (
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={!canDelete}
            className="rounded-full flex-1"
          >
            <Trash2 className="h-4 w-4" />
            {isDraft ? '删除草稿' : '删除退回事项'}
          </Button>
        )}
      </div>
      {deleteDisabledReason && (
        <p className="mt-2 text-xs text-amber-700">{deleteDisabledReason}</p>
      )}
    </div>
  );
}
