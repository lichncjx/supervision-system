'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApproveDialog } from '@/features/workflow/ui/approve-dialog';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkflowApprovalPanelProps {
  visible: boolean;
  onApprove: (comment?: string, nextApproverId?: number | null) => void;
  onReject: () => void;
  companyLeaders?: Array<{ id: number; name: string; role: string }>;
  needsLeaderSelection?: boolean;
}

export function WorkflowApprovalPanel({
  visible,
  onApprove,
  onReject,
  companyLeaders = [],
  needsLeaderSelection = false,
}: WorkflowApprovalPanelProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <div className={PANEL_PADDED}>
        <h3 className="font-semibold text-slate-800 mb-4">审批操作</h3>
        <div className="flex gap-3">
          <Button onClick={() => setIsApproveDialogOpen(true)} className="rounded-full">
            审批通过
          </Button>
          <Button variant="destructive" onClick={onReject} className="rounded-full">
            退回
          </Button>
        </div>
      </div>

      <ApproveDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        onConfirm={onApprove}
        companyLeaders={companyLeaders}
        needsLeaderSelection={needsLeaderSelection}
      />
    </>
  );
}
