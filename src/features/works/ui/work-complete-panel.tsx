'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CheckCircle, Download, Loader2 } from 'lucide-react';
import type { Attachment } from '@/features/attachments/domain/attachment-client.types';
import { FIELD_LABEL, PANEL_PADDED } from './visual-tokens';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

interface WorkCompletePanelProps {
  proof: string;
  onProofChange: (value: string) => void;
  evidenceAttachments: Attachment[];
  onUploadEvidence: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteEvidence: (attachmentId: number) => void;
  uploading: boolean;
  onComplete: () => void;
}

export function WorkCompletePanel({
  proof,
  onProofChange,
  evidenceAttachments,
  onUploadEvidence,
  onDeleteEvidence,
  uploading,
  onComplete,
}: WorkCompletePanelProps) {
  return (
    <div className={PANEL_PADDED}>
      <h3 className="font-semibold text-slate-800 mb-4">提交完成材料</h3>
      <div className="space-y-3">
        <div>
          <label className={FIELD_LABEL + ' mb-1 block'}>完成见证材料说明</label>
          <Textarea value={proof} onChange={(e) => onProofChange(e.target.value)} rows={3} />
        </div>

        <div>
          <label className={FIELD_LABEL + ' mb-1 block'}>上传见证材料附件</label>
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
                <div key={att.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium break-words">{att.fileName}</div>
                    <div className="text-xs text-slate-500">
                      {att.userName || '-'}
                      {att.uploadedAt ? ' ' + new Date(att.uploadedAt).toLocaleString() : '-'}
                      {' '}{formatFileSize(att.fileSize)}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2 shrink-0">
                    <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm" className="rounded-full">
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </a>
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => onDeleteEvidence(att.id)}>
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onComplete} className="rounded-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          提交完成材料
        </Button>
      </div>
    </div>
  );
}
