'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { PANEL_PADDED } from './visual-tokens';

interface WorkSidebarActionsProps {
  visible?: boolean;
  onAdjust: () => void;
  onCancel: () => void;
}

export function WorkSidebarActions({ visible = true, onAdjust, onCancel }: WorkSidebarActionsProps) {
  if (!visible) return null;
  return (
    <div className={PANEL_PADDED}>
      <h3 className="text-sm font-semibold text-slate-500 tracking-wide mb-3">操作</h3>
      <div className="flex flex-col gap-2">
        <Button variant="outline" className="rounded-full w-full" onClick={onAdjust}>
          申请调整
        </Button>
        <Button variant="destructive" className="rounded-full w-full" onClick={onCancel}>
          申请取消
        </Button>
      </div>
    </div>
  );
}
