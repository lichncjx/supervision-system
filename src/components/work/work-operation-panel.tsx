'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/common/badges';
import { CheckCircle, Download, Loader2 } from 'lucide-react';
import { getCurrentProcessDescription, type Attachment } from '@/lib/work-store';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

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
    proposedLeader?: string;
    proposedLeaderId?: number;
    proposedLeaderRole?: string;
    proposedScene?: string;
    formedTime?: string;
    responsiblePerson?: string;
    cooperators?: Array<{ departmentId: number; departmentName?: string; leader?: string; person?: string }>;
    workPlan?: string;
    planCompleteTime?: string;
    progress?: string;
    nodes?: any[];
  };
  proof: string;
  onProofChange: (value: string) => void;
  evidenceAttachments: Attachment[];
  onUploadEvidence: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteEvidence: (attachmentId: number) => void;
  uploading: boolean;
  onComplete: () => void;
  onOpenAdjustDialog: (editForm: any, adjustReason: string) => void;
  onOpenCancelDialog: (cancelReason: string) => void;
}

export function WorkOperationPanel({
  work,
  proof,
  onProofChange,
  evidenceAttachments,
  onUploadEvidence,
  onDeleteEvidence,
  uploading,
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
      responsiblePerson: work.responsiblePerson || '',
      proposedLeader: work.proposedLeader || '',
      proposedLeaderId: work.proposedLeaderId ? String(work.proposedLeaderId) : '',
      proposedLeaderRole: work.proposedLeaderRole || '',
      proposedScene: work.proposedScene || '',
      formedTime: work.formedTime || '',
      cooperators: work.cooperators || [],
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
    <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5">
      <h3 className="font-semibold text-slate-800 mb-4">事项操作</h3>
      <div className="space-y-6">
        <div className="space-y-2">
          <div>
            <span className="text-sm text-slate-500">当前状态：</span>
            <StatusBadge status={work.status} work={work} />
          </div>
          <div>
            <span className="text-sm text-slate-500">当前环节：</span>
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
                onChange={onUploadEvidence}
                disabled={uploading}
              />

              {uploading && (
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  上传中...
                </p>
              )}

              {evidenceAttachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {evidenceAttachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium break-words">{att.fileName}</div>
                        <div className="text-xs text-slate-500">
                          {att.userName || '-'}
                          {att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}
                          {formatFileSize(att.fileSize)}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-2 shrink-0">
                        <a
                          href={`/api/attachments/${att.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button type="button" variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            下载
                          </Button>
                        </a>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteEvidence(att.id)}
                        >
                          删除
                        </Button>
                      </div>
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
          <h4 className="font-medium text-slate-600">其他操作</h4>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleOpenAdjust}>
              申请调整
            </Button>

            <Button variant="destructive" onClick={handleOpenCancel}>
              申请取消
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
