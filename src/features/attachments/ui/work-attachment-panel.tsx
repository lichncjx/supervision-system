'use client';

import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { FIELD_LABEL, PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkAttachment {
  id: number;
  fileName: string;
  fileSize: number;
  userId: number;
  userName?: string;
  uploadedAt: string;
}

interface WorkAttachmentPanelProps {
  attachments: WorkAttachment[];
  canUpload: boolean;
  canDelete: (attachment: WorkAttachment) => boolean;
  onUpload: (files: FileList) => void;
  onDelete: (attachmentId: number) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function WorkAttachmentPanel({
  attachments,
  canUpload,
  canDelete,
  onUpload,
  onDelete,
}: WorkAttachmentPanelProps) {
  return (
    <div className={PANEL_PADDED}>
      <h3 className="font-semibold text-slate-800 mb-4">附件管理</h3>
        <div className="flex items-center justify-between mb-4">
          <span className={FIELD_LABEL}>附件列表</span>
          {canUpload && (
            <label className="inline-flex items-center text-sm text-sky-600 cursor-pointer hover:text-sky-700">
              <Upload className="h-4 w-4 mr-1" />
              <span>上传附件</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          )}
        </div>

        {attachments && attachments.length > 0 ? (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between rounded-lg bg-white/60 border border-slate-200 p-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium break-words">{att.fileName}</div>
                  <div className="text-xs text-slate-500">
                    {att.userName || '-'}　
                    {att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}　
                    {formatFileSize(att.fileSize)}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </a>
                  {canDelete(att) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        if (confirm('确定要删除这个附件吗？')) {
                          onDelete(att.id);
                        }
                      }}
                    >
                      删除
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">暂无附件</p>
        )}
    </div>
  );
}