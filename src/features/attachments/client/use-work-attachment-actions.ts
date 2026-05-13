'use client';

import { useState } from 'react';
import type { User } from '@/lib/auth';
import type { Work } from '@/features/works/client/work-view.types';

interface UseWorkAttachmentActionsParams {
  work: Work | undefined;
  user: User | null | undefined;
  onRefresh: () => void;
}

export function useWorkAttachmentActions({
  work,
  user,
  onRefresh,
}: UseWorkAttachmentActionsParams) {
  const [uploading, setUploading] = useState(false);
  const workId = work?.id ?? 0;

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('workItemId', String(workId));
      formData.append('file', file);
      formData.append('category', 'evidence');

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.error || '上传失败');
        }
      } catch (err) {
        console.error(err);
        alert('上传失败');
      }
    }
    setUploading(false);
    e.target.value = '';
    onRefresh();
  };

  const handleDeleteEvidence = async (attachmentId: number) => {
    if (!confirm('确定要删除该证明材料附件吗？')) return;
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || '删除失败');
        return;
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('删除失败');
    }
  };

  const handleUploadAttachments = async (files: FileList) => {
    if (!user) return;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('workItemId', String(workId));
      formData.append('file', file);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.error || '上传失败');
        }
      } catch (err) {
        console.error(err);
        alert('上传失败');
      }
    }
    onRefresh();
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || '删除失败');
        return;
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('删除失败');
    }
  };

  return {
    uploading,
    handleUploadEvidence,
    handleDeleteEvidence,
    handleUploadAttachments,
    handleDeleteAttachment,
  };
}
