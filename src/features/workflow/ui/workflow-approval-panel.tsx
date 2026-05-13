'use client';

import { Button } from '@/components/ui/button';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkflowApprovalPanelProps {
  visible: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function WorkflowApprovalPanel({ visible, onApprove, onReject }: WorkflowApprovalPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className={PANEL_PADDED}>
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
