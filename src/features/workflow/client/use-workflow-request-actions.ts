'use client';

import type { User } from '@/lib/auth';
import type { Work, WorkEditablePatch } from '@/lib/work-store';
import {
  submitComplete,
  submitAdjust,
  submitCancel,
  submitTodoDecomposition,
  resubmitRejectedWork,
  submitWork,
} from '@/lib/work-store';

interface UseWorkflowRequestActionsParams {
  work: Work | undefined;
  user: User | null | undefined;
  onRefresh: () => void;
  editForm: any;
  setEditMode: (v: boolean) => void;
  editReason: string;
  companyLeaders: Array<{ id: number; name: string; role: string }>;
  adjustReason: string;
  cancelReason: string;
  approvalLeaderId: string;
  proof: string;
}

export function useWorkflowRequestActions({
  work,
  user,
  onRefresh,
  editForm,
  setEditMode,
  editReason,
  companyLeaders,
  adjustReason,
  cancelReason,
  approvalLeaderId,
  proof,
}: UseWorkflowRequestActionsParams) {
  const noop = async () => {};
  if (!work) {
    return {
      handlePropose: noop,
      handleResubmit: noop,
      handleComplete: noop,
      handleAdjust: noop,
      handleCancel: noop,
      handleDecompose: noop,
    };
  }

  const handlePropose = async () => {
    if (!user) return;
    try {
      await submitWork(work, user);
      onRefresh();
      alert('已提交审批');
    } catch (error) {
      console.error(error);
      alert('提交审批失败，请查看控制台错误');
    }
  };

  const handleResubmit = async () => {
    if (!user) return;

    if (!editReason.trim()) {
      alert('请填写修改说明或重新提交原因');
      return;
    }

    const selectedProposedLeader =
      work.type === '待办'
        ? companyLeaders.find((leader) => leader.id === Number(editForm.proposedLeaderId))
        : null;

    if (work.type === '待办' && !selectedProposedLeader) {
      alert('请选择事项提出领导');
      return;
    }

    const patch: WorkEditablePatch = {
      ...editForm,
      title: editForm.workItem || editForm.title || work.title,
    };

    if (work.type === '待办' && selectedProposedLeader) {
      patch.proposedLeader = selectedProposedLeader.name;
      patch.proposedLeaderId = selectedProposedLeader.id;
      patch.proposedLeaderRole = selectedProposedLeader.role;
    }

    try {
      await resubmitRejectedWork(work, user, patch);
      setEditMode(false);
      onRefresh();
      alert('已修改并重新提交审批');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!proof.trim()) {
      alert('请填写见证材料说明');
      return;
    }

    try {
      await submitComplete(work, user, proof);
      onRefresh();
      alert('已提交完成材料');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  const handleAdjust = async () => {
    if (!user) return;

    if (!adjustReason.trim()) {
      alert('请填写调整原因');
      return;
    }

    const pendingAdjustment: WorkEditablePatch = {
      ...editForm,
      title: editForm.workItem || editForm.title || work.title,
    };

    const selectedApprovalLeader = companyLeaders.find(
      (leader) => leader.id === Number(approvalLeaderId)
    );

    if (!selectedApprovalLeader) {
      alert('请选择公司审批领导');
      return;
    }

    try {
      await submitAdjust(work, user, adjustReason, pendingAdjustment);
      onRefresh();
      alert('已提交调整申请，等待审批');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  const handleCancel = async () => {
    if (!user) return;

    if (!cancelReason.trim()) {
      alert('请填写取消原因');
      return;
    }

    const selectedApprovalLeader = companyLeaders.find(
      (leader) => leader.id === Number(approvalLeaderId)
    );

    if (!selectedApprovalLeader) {
      alert('请选择公司审批领导');
      return;
    }

    try {
      await submitCancel(work, user, cancelReason);
      onRefresh();
      alert('已提交取消申请');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  const handleDecompose = async () => {
    if (!user) return;
    if (!editForm.workPlan?.trim()) {
      alert('请填写工作计划');
      return;
    }
    if (!editForm.planCompleteTime) {
      alert('请填写计划完成时间');
      return;
    }

    const validNodes = (editForm.nodes || []).filter((node: any) => node.title?.trim());

    if (validNodes.length === 0) {
      alert('请至少填写一个任务节点');
      return;
    }

    if (validNodes.some((node: any) => !node.completeTime)) {
      alert('请填写每个任务节点的完成时间');
      return;
    }

    try {
      await submitTodoDecomposition(work, user, {
        ...editForm,
        title: editForm.workItem || work.title,
      });

      onRefresh();
      alert('已提交待办事项分解，等待审批');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  return {
    handlePropose,
    handleResubmit,
    handleComplete,
    handleAdjust,
    handleCancel,
    handleDecompose,
  };
}
