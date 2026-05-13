'use client';

import type { User } from '@/lib/auth';
import type { Work } from '@/lib/work-store';
import { approveWork, rejectWork } from '@/lib/work-store';

interface UseWorkflowApprovalActionsParams {
  work: Work | undefined;
  user: User | null | undefined;
  onRefresh: () => void;
}

export function useWorkflowApprovalActions({
  work,
  user,
  onRefresh,
}: UseWorkflowApprovalActionsParams) {
  const noop = async () => {};
  if (!work) {
    return { handleApprove: noop, handleReject: noop };
  }

  const handleApprove = async () => {
    if (!user) return;
    try {
      await approveWork(user, work);
      onRefresh();
      alert('审批已通过');
    } catch (error) {
      console.error(error);
      alert('审批失败，请查看控制台错误');
    }
  };

  const handleReject = async () => {
    const reason = prompt('请输入退回原因：');
    if (reason === null) return;
    if (!user) return;

    try {
      await rejectWork(work, user, reason || '审批退回');
      onRefresh();
      alert('已退回');
    } catch (error) {
      console.error(error);
      alert('退回失败，请查看控制台错误');
    }
  };

  return {
    handleApprove,
    handleReject,
  };
}
