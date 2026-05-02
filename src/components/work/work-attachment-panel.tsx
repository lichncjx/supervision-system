'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';

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
    <Card>
      <CardHeader>
        <CardTitle>附件管理</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">附件列表</span>
          {canUpload && (
            <label className="inline-flex items-center text-sm text-blue-600 cursor-pointer hover:text-blue-800">
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
              <div key={att.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium break-words">{att.fileName}</div>
                  <div className="text-xs text-gray-500">
                    {att.userName || '-'}　
                    {att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}　
                    {formatFileSize(att.fileSize)}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      下载
                    </Button>
                  </a>
                  {canDelete(att) && (
                    <Button
                      variant="outline"
                      size="sm"
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
          <p className="text-gray-500 text-sm">暂无附件</p>
        )}
      </CardContent>
    </Card>
  );
}