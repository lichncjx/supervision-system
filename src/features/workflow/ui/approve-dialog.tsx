'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (comment?: string, nextApproverId?: number | null) => void;
  companyLeaders: Array<{ id: number; name: string; role: string }>;
  needsLeaderSelection: boolean;
}

export function ApproveDialog({
  open,
  onOpenChange,
  onConfirm,
  companyLeaders,
  needsLeaderSelection,
}: ApproveDialogProps) {
  const [comment, setComment] = useState('');
  const [selectedLeaderId, setSelectedLeaderId] = useState('');

  useEffect(() => {
    if (open) {
      setComment('');
      setSelectedLeaderId(needsLeaderSelection && companyLeaders.length > 0 ? String(companyLeaders[0].id) : '');
    }
  }, [open, needsLeaderSelection, companyLeaders]);

  const handleConfirm = () => {
    onConfirm(
      comment || undefined,
      needsLeaderSelection && selectedLeaderId ? Number(selectedLeaderId) : null,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl border-slate-200/80">
        <DialogHeader>
          <DialogTitle>审批通过</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {needsLeaderSelection && companyLeaders.length > 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                公司主管领导
              </label>
              <Select value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="请选择公司主管领导" />
                </SelectTrigger>
                <SelectContent>
                  {companyLeaders.map((leader) => (
                    <SelectItem key={leader.id} value={String(leader.id)}>{leader.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              审批意见（可选）
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="请输入审批意见"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="rounded-full"
            onClick={handleConfirm}
            disabled={needsLeaderSelection && !selectedLeaderId}
          >
            确认通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
