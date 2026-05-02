'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common/badges';
import { CheckCircle } from 'lucide-react';
import { getCurrentProcessDescription, type ProofFile } from '@/lib/work-store';

interface WorkOperationPanelProps {
  work: {
    id: number;
    title?: string;
    status: string;
    type: string;
    currentApproverRole?: string;
    currentApproverId?: number;
    workItem?: string;
    description?: string;
    businessCategory?: string;
    isInnovation?: boolean;
    completeTime?: string;
    completeForm?: string;
    departmentId?: number;
    responsibleLeader?: string;
    supervisor?: string;
    proposedLeader?: string;
    proposedLeaderId?: number;
    proposedLeaderRole?: string;
    proposedScene?: string;
    formedTime?: string;
    responsiblePerson?: string;
    cooperateDepartment?: string;
    cooperatePerson?: string;
    workPlan?: string;
    planCompleteTime?: string;
    progress?: string;
    nodes?: any[];
  };
  proof: string;
  onProofChange: (value: string) => void;
  proofFiles: ProofFile[];
  onProofFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveProofFile: (fileId: number) => void;
  onComplete: () => void;
  onOpenAdjustDialog: (editForm: any, adjustReason: string) => void;
  onOpenCancelDialog: (cancelReason: string) => void;
}

export function WorkOperationPanel({
  work,
  proof,
  onProofChange,
  proofFiles,
  onProofFileChange,
  onRemoveProofFile,
  onComplete,
  onOpenAdjustDialog,
  onOpenCancelDialog,
}: WorkOperationPanelProps) {
  const handleOpenAdjust = () => {
    const editForm = {
      title: work.title || '',
      workItem: work.workItem || work.title || '',
      description: work.description || '',
      businessCategory: work.businessCategory || '',
      isInnovation: !!work.isInnovation,
      completeTime: work.completeTime || '',
      completeForm: work.completeForm || '',
      departmentId: work.departmentId,
      responsibleLeader: work.responsibleLeader || '',
      supervisor: work.supervisor || '',
      proposedLeader: work.proposedLeader || '',
      proposedLeaderId: work.proposedLeaderId ? String(work.proposedLeaderId) : '',
      proposedLeaderRole: work.proposedLeaderRole || '',
      proposedScene: work.proposedScene || '',
      formedTime: work.formedTime || '',
      responsiblePerson: work.responsiblePerson || '',
      cooperateDepartment: work.cooperateDepartment || '',
      cooperatePerson: work.cooperatePerson || '',
      workPlan: work.workPlan || '',
      planCompleteTime: work.planCompleteTime || '',
      progress: work.progress || '',
      nodes: work.nodes || [],
    };
    onOpenAdjustDialog(editForm, '');
  };

  const handleOpenCancel = () => {
    onOpenCancelDialog('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>事项操作</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div>
            <span className="text-sm text-gray-500">当前状态：</span>
            <StatusBadge status={work.status} />
          </div>
          <div>
            <span className="text-sm text-gray-500">当前环节：</span>
            <span className="text-blue-600">
              {getCurrentProcessDescription(work.status, work.currentApproverRole, work.currentApproverId)}
            </span>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium">提交完成材料</h4>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">完成见证材料说明</label>
              <Textarea value={proof} onChange={(e) => onProofChange(e.target.value)} rows={3} />
            </div>

            <div>
              <label className="text-sm font-medium">上传见证材料附件</label>
              <Input
                type="file"
                multiple
                onChange={onProofFileChange}
              />

              {proofFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {proofFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <span className="break-words">{file.name}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveProofFile(file.id)}
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={onComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              提交完成材料
            </Button>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-gray-600">其他操作</h4>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleOpenAdjust}>
              申请调整
            </Button>

            <Button variant="destructive" onClick={handleOpenCancel}>
              申请取消
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
