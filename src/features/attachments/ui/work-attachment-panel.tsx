'use client';

import { Upload, Download, Trash2, Paperclip } from 'lucide-react';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-500 tracking-wide">附件</h3>
        {canUpload && (
          <label className="inline-flex items-center gap-1 text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            <span>上传</span>
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
        <div>
          {attachments.map((att) => (
            <div key={att.id} className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-b-0">
              <Paperclip className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-slate-700 break-words">{att.fileName}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {att.userName || '-'} · {formatFileSize(att.fileSize)}
                  {att.uploadedAt && <> · {new Date(att.uploadedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <Download className="h-3.5 w-3.5" />
                </a>
                {canDelete(att) && (
                  <button
                    className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                    onClick={() => {
                      if (confirm('确定要删除这个附件吗？')) {
                        onDelete(att.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">暂无附件</p>
      )}
    </div>
  );
}
