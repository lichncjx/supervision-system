'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FIELD_LABEL } from './visual-tokens';

interface WorkActionDialogsProps {
  isCancelDialogOpen: boolean;
  setIsCancelDialogOpen: (value: boolean) => void;
  cancelReason: string;
  setCancelReason: (reason: string) => void;
  approvalLeaderName?: string | null;
  proposedLeaderName?: string | null;
  onSubmitCancel: () => void;
}

export function WorkActionDialogs({
  isCancelDialogOpen,
  setIsCancelDialogOpen,
  cancelReason,
  setCancelReason,
  approvalLeaderName,
  proposedLeaderName,
  onSubmitCancel,
}: WorkActionDialogsProps) {
  const readonlyApprovalLeader = approvalLeaderName || proposedLeaderName || '-';

  return (
    <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
      <DialogContent className="rounded-xl border-slate-200/80 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>申请取消</DialogTitle>
          <DialogDescription>
            取消申请审批通过后，事项将进入已取消状态，请谨慎操作。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className={FIELD_LABEL + ' mb-1 block'}>
              公司审批领导
              <span className="text-xs text-slate-400 ml-1">（负责本次取消审批的公司领导）</span>
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {readonlyApprovalLeader}
            </div>
          </div>

          <div>
            <label className={FIELD_LABEL + ' mb-1 block'}>取消原因</label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="请填写取消原因"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setIsCancelDialogOpen(false);
            }}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            className="rounded-full"
            onClick={async () => {
              await onSubmitCancel();
              setIsCancelDialogOpen(false);
            }}
          >
            提交取消申请
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
