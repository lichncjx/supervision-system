'use client';

import type { User } from '@/lib/auth';
import type { Work } from '@/lib/work-store';
import { updateWork, deleteWork } from '@/lib/work-store';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

interface UseWorkEditActionsParams {
  work: Work | undefined;
  user: User | null | undefined;
  onRefresh: () => void;
  editForm: any;
  setEditMode: (v: boolean) => void;
  router: AppRouterInstance;
  type: string;
}

export function useWorkEditActions({
  work,
  user,
  onRefresh,
  editForm,
  setEditMode,
  router,
  type,
}: UseWorkEditActionsParams) {
  const noop = async () => {};
  if (!work) {
    return {
      handleSaveDraft: noop,
      handleDelete: noop,
    };
  }

  const handleSaveDraft = async () => {
    if (!user) return;
    try {
      await updateWork(work.id, editForm);
      setEditMode(false);
      alert('草稿已保存');
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('保存草稿失败');
    }
  };

  const handleDelete = async () => {
    if (!confirm('确认删除该退回事项？')) return;
    try {
      await deleteWork(work.id);
      router.push(`/${type}`);
    } catch (error) {
      console.error(error);
      alert('删除失败，请查看控制台错误');
    }
  };

  return {
    handleSaveDraft,
    handleDelete,
  };
}
