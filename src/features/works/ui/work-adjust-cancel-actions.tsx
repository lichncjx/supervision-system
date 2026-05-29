'use client';

import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PANEL_PADDED } from './visual-tokens';

interface WorkAdjustCancelActionsProps {
  visible?: boolean;
  onAdjust: () => void;
  onCancel: () => void;
}

export function WorkAdjustCancelActions({ visible = true, onAdjust, onCancel }: WorkAdjustCancelActionsProps) {
  if (!visible) return null;
  return (
    <div className={PANEL_PADDED}>
      <h3 className="text-sm font-semibold text-slate-500 tracking-wide mb-3">操作</h3>
      <div className="flex gap-2">
        <Button className="rounded-full flex-1" onClick={onAdjust}>
          <Pencil className="h-4 w-4" />
          申请调整
        </Button>
        <Button variant="destructive" className="rounded-full flex-1" onClick={onCancel}>
          <X className="h-4 w-4" />
          申请取消
        </Button>
      </div>
    </div>
  );
}
