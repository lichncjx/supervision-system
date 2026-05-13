'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { getCompanyLeaders, getDepartments, getDepartmentLeaders, getDepartmentManagers } from '@/lib/auth';
import {
  getWorkById,
  submitComplete,
  submitAdjust,
  submitCancel,
  submitTodoDecomposition,
  approveWork,
  rejectWork,
  resubmitRejectedWork,
  updateWork,
  deleteWork,
  getWorkflowRecords,
  submitWork,
  type WorkEditablePatch,
  type Work,
  type WorkflowRecord,
} from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { workTypeColors } from '@/lib/status-colors';
import { WorkAttachmentPanel } from '@/features/attachments/ui/work-attachment-panel';
import { WorkOperationPanel } from '@/features/works/ui/work-operation-panel';
import { WorkWorkflowRecords } from '@/features/workflow/ui/work-workflow-records';
import { WorkApprovalPanel } from '@/features/workflow/ui/work-approval-panel';
import { WorkDraftEditPanel } from '@/features/works/ui/work-draft-edit-panel';
import { WorkDisplayInfo } from '@/features/works/ui/work-display-info';
import { WorkDecomposePanel } from '@/features/workflow/ui/work-decompose-panel';
import { WorkActionDialogs } from '@/features/works/ui/work-action-dialogs';
import { WorkPendingAdjustmentPanel } from '@/features/workflow/ui/work-pending-adjustment-panel';
import { WorkflowProgress } from '@/features/workflow/ui/workflow-progress';
import { useWorkDetailPermissions } from '@/features/works/client/use-work-detail-permissions';

export default function WorkDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const type = params?.type || 'todo';
  const id = params?.id || '';
  const { user } = useAuth();
  const router = useRouter();
  const [companyLeaders, setCompanyLeaders] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string; code: string; isBusiness: boolean }>>([]);
  const [proof, setProof] = useState('');
  const [uploading, setUploading] = useState(false);
  const [adjustReason, setAdjustReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [approvalLeaderId, setApprovalLeaderId] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editReason, setEditReason] = useState('');
  const [departmentLeaders, setDepartmentLeaders] = useState<Array<{ id: number; name: string; role: string; departmentId: number }>>([]);
  const [departmentManagers, setDepartmentManagers] = useState<Array<{ id: number; name: string; role: string; departmentId: number }>>([]);

  const [work, setWork] = useState<Work | undefined>();
  const [workflowRecords, setWorkflowRecords] = useState<WorkflowRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [leaders, depts] = await Promise.all([
        getCompanyLeaders(),
        getDepartments(),
      ]);
      setCompanyLeaders(leaders);
      setDepartments(depts);
      if (leaders.length > 0 && !approvalLeaderId) {
        setApprovalLeaderId(String(leaders[0].id));
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchWork = async () => {
      const data = await getWorkById(Number(id));
      setWork(data);
    };
    fetchWork();
  }, [id, refresh]);

  useEffect(() => {
    const fetchWorkflowRecords = async () => {
      if (work) {
        const records = await getWorkflowRecords(work.id);
        setWorkflowRecords(records);
      }
    };
    fetchWorkflowRecords();
  }, [work, refresh]);

  useEffect(() => {
    if (work && (work.type === '重点' || work.type === '主要') && work.departmentId) {
      const fetchDeptUsers = async () => {
        const [leaders, managers] = await Promise.all([
          getDepartmentLeaders(work.departmentId!),
          getDepartmentManagers(work.departmentId!),
        ]);
        setDepartmentLeaders(leaders);
        setDepartmentManagers(managers);
      };
      fetchDeptUsers();
    }
  }, [work?.departmentId, work?.type, work]);

  React.useEffect(() => {
    if (work) {
      setEditForm({
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
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work?.id, refresh]);

  const perms = useWorkDetailPermissions(work, user);

  if (!work) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">事项不存在</p>
        <Link href={`/${type}`}>
          <Button variant="link" className="rounded-full">返回列表</Button>
        </Link>
      </div>
    );
  }

  const handleSaveDraft = async () => {
    if (!user) return;
    try {
      await updateWork(work.id, editForm);
      setEditMode(false);
      alert('草稿已保存');
      setRefresh((v) => v + 1);
    } catch (error) {
      console.error(error);
      alert('保存草稿失败');
    }
  };

  const handleSubmitDraft = async () => {
    if (!user) return;
    try {
      await submitWork(work, user);
      setRefresh(refresh + 1);
      alert('已提交审批');
    } catch (error) {
      console.error(error);
      alert('提交审批失败，请查看控制台错误');
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('workItemId', String(work.id));
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
    setRefresh((v) => v + 1);
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
      setRefresh((v) => v + 1);
    } catch (err) {
      console.error(err);
      alert('删除失败');
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
      setRefresh(refresh + 1);
      alert('已提交完成材料');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
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
      setRefresh((v) => v + 1);
      alert('已修改并重新提交审批');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  const handleAdjustSubmit = async () => {
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
      setRefresh((v) => v + 1);
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
      setRefresh((v) => v + 1);
      alert('已提交取消申请');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  const handleApprove = async () => {
    if (!user) return;
    try {
      await approveWork(user, work);
      setRefresh((v) => v + 1);
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
      setRefresh((v) => v + 1);
      alert('已退回');
    } catch (error) {
      console.error(error);
      alert('退回失败，请查看控制台错误');
    }
  };

  const handleUploadAttachments = async (files: FileList) => {
    if (!user) return;
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('workItemId', String(work.id));
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
    setRefresh((v) => v + 1);
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
      setRefresh((v) => v + 1);
    } catch (err) {
      console.error(err);
      alert('删除失败');
    }
  };

  const isPriorityOrMain = work.type === '重点' || work.type === '主要';
  const isTodo = work.type === '待办';
  const typeColorKey = work.type === '重点' ? 'priority' : work.type === '主要' ? 'main' : 'todo';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${type}`}>
          <Button variant="outline" size="sm" className="rounded-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <h1 className="stagger-1 flex items-center gap-3 text-2xl font-bold text-slate-800">
          <span className="w-1 h-6 rounded-full bg-slate-500" />
          事项详情
        </h1>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden stagger-1">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <span className={`w-1.5 h-8 rounded-full ${workTypeColors[typeColorKey]?.text?.replace('text-', 'bg-') || 'bg-slate-400'}`} />
            <h2 className="font-semibold text-slate-800">{work.title}</h2>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <WorkDisplayInfo work={work} departments={departments} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden stagger-2">
        <div className="p-4">
          <WorkflowProgress work={work} />
        </div>
      </div>

      <WorkAttachmentPanel
        attachments={(work.attachments || []).filter(a => a.category !== 'evidence')}
        canUpload={!!perms.canEdit}
        canDelete={perms.canDeleteAttachment}
        onUpload={handleUploadAttachments}
        onDelete={handleDeleteAttachment}
      />

      <WorkDraftEditPanel
        visible={!!perms.canHandleReturnedCreate || !!perms.canEditDraft}
        rejectReason={work.rejectReason || ''}
        editMode={editMode}
        setEditMode={setEditMode}
        editForm={editForm}
        setEditForm={setEditForm}
        editReason={editReason}
        setEditReason={setEditReason}
        isPriorityOrMain={isPriorityOrMain}
        isTodo={isTodo}
        departments={departments}
        companyLeaders={companyLeaders}
        departmentLeaders={departmentLeaders}
        departmentManagers={departmentManagers}
        onResubmit={handleResubmit}
        onSaveDraft={handleSaveDraft}
        isRegularDraft={perms.isRegularDraft}
        onDelete={async () => {
          if (!confirm('确认删除该退回事项？')) return;
          try {
            await deleteWork(work.id);
            router.push(`/${type}`);
          } catch (error) {
            console.error(error);
            alert('删除失败，请查看控制台错误');
          }
        }}
      />

      <WorkDecomposePanel
        visible={!!perms.canDecomposeTodo}
        editForm={editForm}
        setEditForm={setEditForm}
        rejectReason={work.rejectReason || ''}
        isReturned={!!(work.status === 'pending_decompose' && (work.rejectReason || work.rejectedFromStatus))}
        onSubmitDecomposition={async () => {
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

            setRefresh((v) => v + 1);
            alert('已提交待办事项分解，等待审批');
          } catch (error) {
            console.error(error);
            alert('提交失败，请查看控制台错误');
          }
        }}
      />

      {perms.canSubmitDraft && (
        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden stagger-3">
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-sm text-slate-500">当前为草稿状态，请提交审批：</span>
                <p className="text-xs text-slate-400 mt-1">提交后将由系统按工作流规则自动分配审批节点；责任领导、责任人仅用于业务留痕。</p>
              </div>
              <Button onClick={handleSubmitDraft} className="rounded-full">提交审批</Button>
            </div>
          </div>
        </div>
      )}

      <WorkOperationPanel
        work={work}
        proof={proof}
        onProofChange={setProof}
        evidenceAttachments={(work.attachments || []).filter(a => a.category === 'evidence')}
        onUploadEvidence={handleUploadEvidence}
        onDeleteEvidence={handleDeleteEvidence}
        uploading={uploading}
        onComplete={handleComplete}
        onOpenAdjustDialog={(editForm, adjustReason) => {
          setEditForm(editForm);
          setAdjustReason(adjustReason);
          setIsAdjustDialogOpen(true);
        }}
        onOpenCancelDialog={(cancelReason) => {
          setCancelReason(cancelReason);
          setIsCancelDialogOpen(true);
        }}
      />

      <WorkApprovalPanel
        visible={perms.canApprove}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <WorkPendingAdjustmentPanel work={work} />

      <WorkWorkflowRecords records={workflowRecords} />

      <WorkActionDialogs
        isAdjustDialogOpen={isAdjustDialogOpen}
        setIsAdjustDialogOpen={setIsAdjustDialogOpen}
        isCancelDialogOpen={isCancelDialogOpen}
        setIsCancelDialogOpen={setIsCancelDialogOpen}
        adjustReason={adjustReason}
        setAdjustReason={setAdjustReason}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        approvalLeaderId={approvalLeaderId}
        setApprovalLeaderId={setApprovalLeaderId}
        editForm={editForm}
        setEditForm={setEditForm}
        companyLeaders={companyLeaders}
        departments={departments}
        isPriorityOrMain={isPriorityOrMain}
        isTodo={isTodo}
        onSubmitAdjust={handleAdjustSubmit}
        onSubmitCancel={handleCancel}
      />
    </div>
  );
}
