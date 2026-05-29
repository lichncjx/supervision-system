'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApproveDialog } from '@/features/workflow/ui/approve-dialog';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkflowApprovalPanelProps {
  visible: boolean;
  onApprove: (comment?: string, nextApproverId?: number | null) => void;
  onReject: () => void;
  companyLeaders?: Array<{ id: number; name: string; role: string }>;
  needsLeaderSelection?: boolean;
  leaderName?: string | null;
}

export function WorkflowApprovalPanel({
  visible,
  onApprove,
  onReject,
  companyLeaders = [],
  needsLeaderSelection = false,
  leaderName,
}: WorkflowApprovalPanelProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

  if (!visible) return null;

  return (
    <>
      <div className={PANEL_PADDED}>
        <h3 className="text-sm font-semibold text-slate-500 tracking-wide mb-3">审批操作</h3>
        <div className="flex gap-2">
          <Button onClick={() => setIsApproveDialogOpen(true)} className="rounded-full flex-1">
            <Check className="h-4 w-4" />
            审批通过
          </Button>
          <Button variant="destructive" onClick={onReject} className="rounded-full flex-1">
            <X className="h-4 w-4" />
            审批拒绝
          </Button>
        </div>
      </div>

      <ApproveDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        onConfirm={onApprove}
        companyLeaders={companyLeaders}
        needsLeaderSelection={needsLeaderSelection}
        leaderName={leaderName}
      />
    </>
  );
}
