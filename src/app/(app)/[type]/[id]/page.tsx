'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { workTypeColors } from '@/lib/status-colors';
import { WorkAttachmentPanel } from '@/features/attachments/ui/work-attachment-panel';
import { WorkOperationPanel } from '@/features/works/ui/work-operation-panel';
import { WorkflowRecords } from '@/features/workflow/ui/workflow-records';
import { WorkflowApprovalPanel } from '@/features/workflow/ui/workflow-approval-panel';
import { WorkDraftEditPanel } from '@/features/works/ui/work-draft-edit-panel';
import { WorkDisplayInfo } from '@/features/works/ui/work-display-info';
import { WorkDecomposePanel } from '@/features/works/ui/work-decompose-panel';
import { WorkActionDialogs } from '@/features/works/ui/work-action-dialogs';
import { WorkPendingAdjustmentPanel } from '@/features/works/ui/work-pending-adjustment-panel';
import { WorkflowProgress } from '@/features/workflow/ui/workflow-progress';
import { useWorkDetailPermissions } from '@/features/works/client/use-work-detail-permissions';
import { useWorkDetailData } from '@/features/works/client/use-work-detail-data';
import { useWorkEditActions } from '@/features/works/client/use-work-edit-actions';
import { useWorkAttachmentActions } from '@/features/attachments/client/use-work-attachment-actions';
import { useWorkflowRequestActions } from '@/features/workflow/client/use-workflow-request-actions';
import { useWorkflowApprovalActions } from '@/features/workflow/client/use-workflow-approval-actions';

export default function WorkDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const type = params?.type || 'todo';
  const id = params?.id || '';
  const { user } = useAuth();
  const router = useRouter();
  const [proof, setProof] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [approvalLeaderId, setApprovalLeaderId] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [editReason, setEditReason] = useState('');

  const {
    work,
    workflowRecords,
    companyLeaders,
    departments,
    departmentLeaders,
    departmentManagers,
    refresh,
    onRefresh,
  } = useWorkDetailData({ type, id, approvalLeaderId, setApprovalLeaderId });

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

  const uploadActions = useWorkAttachmentActions({
    work,
    user,
    onRefresh,
  });

  const editActions = useWorkEditActions({
    work,
    user,
    onRefresh,
    editForm,
    setEditMode,
    router,
    type,
  });

  const requestActions = useWorkflowRequestActions({
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
  });

  const approvalActions = useWorkflowApprovalActions({
    work,
    user,
    onRefresh,
  });

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
        onUpload={uploadActions.handleUploadAttachments}
        onDelete={uploadActions.handleDeleteAttachment}
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
        onResubmit={requestActions.handleResubmit}
        onSaveDraft={editActions.handleSaveDraft}
        isRegularDraft={perms.isRegularDraft}
        onDelete={editActions.handleDelete}
      />

      <WorkDecomposePanel
        visible={!!perms.canDecomposeTodo}
        editForm={editForm}
        setEditForm={setEditForm}
        rejectReason={work.rejectReason || ''}
        isReturned={!!(work.status === 'pending_decompose' && (work.rejectReason || work.rejectedFromStatus))}
        onSubmitDecomposition={requestActions.handleDecompose}
      />

      {perms.canSubmitDraft && (
        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 overflow-hidden stagger-3">
          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-sm text-slate-500">当前为草稿状态，请提交审批：</span>
                <p className="text-xs text-slate-400 mt-1">提交后将由系统按工作流规则自动分配审批节点；责任领导、责任人仅用于业务留痕。</p>
              </div>
              <Button onClick={requestActions.handlePropose} className="rounded-full">提交审批</Button>
            </div>
          </div>
        </div>
      )}

      <WorkOperationPanel
        work={work}
        proof={proof}
        onProofChange={setProof}
        evidenceAttachments={(work.attachments || []).filter(a => a.category === 'evidence')}
        onUploadEvidence={uploadActions.handleUploadEvidence}
        onDeleteEvidence={uploadActions.handleDeleteEvidence}
        uploading={uploadActions.uploading}
        onComplete={requestActions.handleComplete}
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

      <WorkflowApprovalPanel
        visible={perms.canApprove}
        onApprove={approvalActions.handleApprove}
        onReject={approvalActions.handleReject}
      />

      <WorkPendingAdjustmentPanel work={work} />

      <WorkflowRecords records={workflowRecords} />

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
        onSubmitAdjust={requestActions.handleAdjust}
        onSubmitCancel={requestActions.handleCancel}
      />
    </div>
  );
}
