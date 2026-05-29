'use client';

import { Download, FileCheck2 } from 'lucide-react';
import type { AttachmentDto as Attachment } from '@/features/attachments/application/attachment.dto';
import { PANEL_PADDED } from '@/features/works/ui/visual-tokens';

interface WorkEvidencePanelProps {
  proof?: string;
  evidenceAttachments: Attachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WorkEvidencePanel({
  proof,
  evidenceAttachments,
}: WorkEvidencePanelProps) {
  const hasProof = Boolean(proof && proof.trim());

  if (!hasProof && evidenceAttachments.length === 0) {
    return null;
  }

  return (
    <div className={PANEL_PADDED}>
      <div className="flex items-center gap-2 mb-3">
        <FileCheck2 className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-semibold text-slate-500 tracking-wide">完成材料</h3>
      </div>

      <div className="space-y-3">
        {hasProof && (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1">见证材料说明</div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap break-words">
              {proof}
            </div>
          </div>
        )}

        {evidenceAttachments.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-1">见证材料附件</div>
            <div>
              {evidenceAttachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 last:border-b-0"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-slate-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-700 break-words">{att.fileName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {att.userName || '-'} · {formatFileSize(att.fileSize)}
                      {att.uploadedAt && (
                        <>
                          {' '}
                          ·{' '}
                          {new Date(att.uploadedAt).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/api/attachments/${att.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
