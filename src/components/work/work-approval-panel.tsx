'use client';

import { Button } from '@/components/ui/button';

interface WorkApprovalPanelProps {
  visible: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function WorkApprovalPanel({ visible, onApprove, onReject }: WorkApprovalPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">审批操作</h3>
      <div className="flex gap-3">
        <Button onClick={onApprove} className="rounded-full">
          审批通过
        </Button>
        <Button variant="destructive" onClick={onReject} className="rounded-full">
          退回
        </Button>
      </div>
    </div>
  );
}
