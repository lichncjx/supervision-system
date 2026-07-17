'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ListTree } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/features/works/ui/badges';
import { getCurrentProcessDescription } from '@/features/works/client/work-display.utils';
import {
  TYPE_THEME,
  DETAIL_THEME,
  PANEL,
  PANEL_PADDED,
} from '@/features/works/ui/visual-tokens';
import { WorkAttachmentPanel } from '@/features/attachments/ui/work-attachment-panel';
import { WorkCompletePanel } from '@/features/works/ui/work-complete-panel';
import { WorkflowRecords } from '@/features/workflow/ui/workflow-records';
import { WorkflowApprovalPanel } from '@/features/workflow/ui/workflow-approval-panel';
import { ApproveDialog } from '@/features/workflow/ui/approve-dialog';
import { WorkDisplayInfo } from '@/features/works/ui/work-display-info';
import { WorkTitle } from '@/features/works/ui/work-title';
import { WorkDecomposePanel } from '@/features/works/ui/work-decompose-panel';
import { WorkActionDialogs } from '@/features/works/ui/work-action-dialogs';
import { WorkPendingAdjustmentPanel } from '@/features/works/ui/work-pending-adjustment-panel';
import { WorkAdjustCancelActions } from '@/features/works/ui/work-adjust-cancel-actions';
import { WorkDraftActions } from '@/features/works/ui/work-draft-actions';
import { WorkAdjustmentHistoryPanel } from '@/features/works/ui/work-adjustment-history-panel';
import { WorkEvidencePanel } from '@/features/works/ui/work-evidence-panel';
import { WorkflowProgress } from '@/features/workflow/ui/workflow-progress';
import { useWorkDetailData } from '@/features/works/client/use-work-detail-data';
import { uploadFiles, deleteAttachment } from '@/features/attachments/client/attachment-api';
import {
  canEditRegularDraftWork,
  canSubmitDraftWork,
  canHandleReturnedDraftWork,
  canDecomposeTodoWork,
  canApproveWork,
  canOperateInProgressWork,
  isWorkRelatedToDepartment,
} from '@/features/works/client/work-client-permissions';
import { isTerminal, isReturnedDraftWork, isInProgress } from '@/features/works/domain/work-status.rules';
import { deleteWork } from '@/features/works/client/work-api';
import {
  submitPropose,
  submitComplete,
  submitCancel,
  submitTodoDecomposition,
  approveWork,
  rejectWork,
} from '@/features/workflow/client/workflow-api';

export default function WorkDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const type = params?.type || 'todo';
  const id = params?.id || '';
  const { user } = useAuth();
  const router = useRouter();
  const [proof, setProof] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const {
    work,
    workflowRecords,
    companyLeaders,
    departments,
    refresh,
    onRefresh,
  } = useWorkDetailData(id);

  React.useEffect(() => {
    if (work) {
      setEditForm({
        workItem: work.workItem || work.title || '',
        description: work.description || '',
        businessCategory: work.businessCategory || '',
        isInnovation: !!work.isInnovation,
        completeForm: work.completeForm || '',
        departmentId: work.departmentId,
        responsibleLeader: work.responsibleLeader || '',
        responsiblePerson: work.responsiblePerson || '',
        responsibleLeaderUserId: work.responsibleLeaderUserId,
        responsiblePersonUserId: work.responsiblePersonUserId,
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

  const [uploading, setUploading] = useState(false);

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

  const workId = work.id;

  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isReturnedDraft = isReturnedDraftWork(work);
  const canEditDraft = canEditRegularDraftWork(user, work);
  const canSubmitDraft = canSubmitDraftWork(user, work);
  const canHandleReturnedCreate = canHandleReturnedDraftWork(user, work);
  const canDecomposeTodo = canDecomposeTodoWork(user, work);
  const canApprove = canApproveWork(user, work);
  const canOperateInProgress = canOperateInProgressWork(user, work);

  const isRelatedDept = user ? isWorkRelatedToDepartment(work, user.departmentId) : false;
  const canUploadAttachmentPanel = user && (
    isAdmin || isSupervisor ||
    ((user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
      isRelatedDept && !isTerminal(work.status) && !isReturnedDraft) ||
    ((work.type === '重点' || work.type === '主要') && isRelatedDept && !isTerminal(work.status))
  );
  const canDeleteAttachment = (att: { userId: number }) =>
    isAdmin || isSupervisor || user?.id === att.userId;

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try { await uploadFiles(workId, files, 'evidence'); } catch (err: any) {
      console.error(err);
      alert(err.message || '上传失败');
    }
    setUploading(false);
    e.target.value = '';
    onRefresh();
  };

  const handleDeleteEvidence = async (attachmentId: number) => {
    if (!confirm('确定要删除该证明材料附件吗？')) return;
    try { await deleteAttachment(attachmentId); } catch (err: any) {
      console.error(err);
      alert(err.message || '删除失败');
      return;
    }
    onRefresh();
  };

  const handleUploadAttachments = async (files: FileList) => {
    if (!user) return;
    try { await uploadFiles(workId, files); } catch (err: any) {
      console.error(err);
      alert(err.message || '上传失败');
    }
    onRefresh();
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm('确定要删除该附件吗？')) return;
    try { await deleteAttachment(attachmentId); } catch (err: any) {
      console.error(err);
      alert(err.message || '删除失败');
      return;
    }
    onRefresh();
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

  const handlePropose = async () => {
    if (!user) return;
    if (
      user.role === 'DEPARTMENT_LEADER' &&
      !work.proposedLeaderId &&
      !work.approvalLeaderId
    ) {
      setIsSubmitDialogOpen(true);
      return;
    }

    await handleSubmitConfirm();
  };

  const handleSubmitConfirm = async (comment?: string, nextApproverId?: number | null) => {
    if (!user) return;
    try {
      await submitPropose(work, nextApproverId, comment);
      onRefresh();
      alert('已提交审批');
    } catch (error) {
      console.error(error);
      alert('提交审批失败，请查看控制台错误');
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!proof.trim()) {
      alert('请填写见证材料说明');
      return;
    }
    try {
      await submitComplete(work, proof);
      onRefresh();
      alert('已提交完成材料');
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
    try {
      await submitCancel(work, cancelReason);
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
      alert('请填写完成时间');
      return;
    }
    const validNodes = (editForm.nodes || []).filter((n: any) => n.title?.trim());
    if (validNodes.length === 0) {
      alert('请至少填写一个任务节点');
      return;
    }
    if (validNodes.some((n: any) => !n.completeTime)) {
      alert('请填写每个任务节点的完成时间');
      return;
    }
    try {
      await submitTodoDecomposition(work, editForm);
      onRefresh();
      alert('已提交待办事项分解，等待审批');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

  const handleApprove = async (comment?: string, nextApproverId?: number | null) => {
    if (!user) return;
    try {
      await approveWork(work, comment, nextApproverId);
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
      await rejectWork(work, reason || '审批退回');
      onRefresh();
      alert('已退回');
    } catch (error) {
      console.error(error);
      alert('退回失败，请查看控制台错误');
    }
  };

  const isTodo = work.type === '待办';
  const typeColorKey = work.type === '重点' ? 'priority' : work.type === '主要' ? 'main' : 'todo';

  const theme = TYPE_THEME[typeColorKey];
  const detailTheme = DETAIL_THEME[typeColorKey];

  return (
    <div className="space-y-6">
      {/* Light Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-white px-5 py-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.07]" style={{ backgroundImage: `linear-gradient(135deg, ${theme.accentHex}33, transparent 60%)` }} />
        <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl ${theme.accent}`} />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Link href={`/${type}`} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              返回列表
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-bold leading-tight text-slate-900">
              <span className={`h-8 w-1 rounded-full ${theme.accent}`} />
              <WorkTitle work={work} />
              <StatusBadge status={work.status} work={work} />
            </h1>
          </div>

          <span className="inline-flex items-center gap-1.5 self-end rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs font-medium text-slate-600">
            {getCurrentProcessDescription(work.status, work.currentApproverRole, work.currentApproverId)}
          </span>
        </div>
        <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: detailTheme.deep }}>
          {isTodo ? (
            <>
              {work.proposedLeader && <span>提出领导 {work.proposedLeader}</span>}
              {work.proposedScene && <span>提出场景 {work.proposedScene}</span>}
              {work.planCompleteTime && <span>完成时间 {work.planCompleteTime}</span>}
            </>
          ) : (
            <>
              {work.planCompleteTime && <span>完成时间 {work.planCompleteTime}</span>}
              <span>{departments.find(d => d.id === work.departmentId)?.name || '-'}</span>
              {work.responsiblePerson && <span>{work.responsiblePerson}</span>}
            </>
          )}
        </div>
      </div>

      {/* Body: Main + Sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Main Area */}
        <div className="lg:col-span-3 space-y-6">
          <WorkPendingAdjustmentPanel work={work} departments={departments} />

          <div className={`${PANEL_PADDED}`}>
            {work.pendingAdjustment && (
              <h3 className="font-semibold text-slate-800 mb-4">当前生效内容</h3>
            )}
            <WorkDisplayInfo
              work={work}
              departments={departments}
              hideNodes={true}
            />
          </div>

          <div className={`${PANEL_PADDED}`}>
            <WorkflowProgress work={work} />
          </div>

          {canSubmitDraft && (
            <div className={`${PANEL} overflow-hidden`}>
              <div className={`flex items-center gap-4 p-5 bg-gradient-to-r ${theme.lightGradient}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.accent} text-white shadow-lg`}>
                  <span className="text-lg">↑</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-slate-800">当前为草稿状态，请提交审批</span>
                </div>
                <Button onClick={handlePropose} className={`rounded-full ${theme.button} border-0`}>
                  提交审批
                </Button>
              </div>
            </div>
          )}

          <ApproveDialog
            open={isSubmitDialogOpen}
            onOpenChange={setIsSubmitDialogOpen}
            onConfirm={handleSubmitConfirm}
            companyLeaders={companyLeaders}
            needsLeaderSelection
            title="提交审批"
            commentLabel="提交说明（可选）"
            confirmLabel="提交审批"
          />
          <WorkflowRecords records={workflowRecords} />
          <WorkAdjustmentHistoryPanel work={work} departments={departments} />
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-2 space-y-4">
          {work.nodes && work.nodes.length > 0 && (
            <section className={PANEL_PADDED}>
              <div className="mb-3 flex items-center gap-2">
                <ListTree className="h-4 w-4 text-sky-500" />
                <h3 className="text-sm font-semibold tracking-wide text-slate-500">任务分解节点</h3>
              </div>
              <div>
                {work.nodes.map((node: any, index: number) => (
                  <div key={node.id ?? index} className="border-b border-slate-100 py-2.5 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm text-slate-700 break-words">{node.title}</div>
                      {node.completeTime && (
                        <span className="shrink-0 text-xs text-slate-400">{node.completeTime}</span>
                      )}
                    </div>
                    {node.children && node.children.length > 0 && (
                      <div className="mt-1.5 space-y-1 pl-3">
                        {node.children.map((child: any, childIndex: number) => (
                          <div key={child.id ?? `${index}-${childIndex}`} className="flex items-baseline justify-between gap-2 pl-2">
                            <div className="text-xs text-slate-500 break-words">{child.title}</div>
                            {child.completeTime && (
                              <span className="shrink-0 text-xs text-slate-400">{child.completeTime}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <WorkAttachmentPanel
            attachments={(work.attachments || []).filter(a => a.category !== 'evidence')}
            canUpload={!!canUploadAttachmentPanel}
            canDelete={canDeleteAttachment}
            onUpload={handleUploadAttachments}
            onDelete={handleDeleteAttachment}
          />

          {(!isInProgress(work.status) || !canOperateInProgress) && (
            <WorkEvidencePanel
              proof={work.proof}
              evidenceAttachments={(work.attachments || []).filter(a => a.category === 'evidence')}
            />
          )}

          {(!!canHandleReturnedCreate || !!canEditDraft) && (
            <WorkDraftActions
              isDraft={!!canEditDraft}
              rejectReason={work.rejectReason || undefined}
              editHref={`/${type}/${work.id}/edit`}
              onDelete={handleDelete}
            />
          )}

          {!!canDecomposeTodo && (
            <WorkDecomposePanel
              editForm={editForm}
              setEditForm={setEditForm}
              rejectReason={work.rejectReason || ''}
              isReturned={!!(work.status === 'pending_decompose' && (work.rejectReason || work.rejectedFromStatus))}
              onSubmitDecomposition={handleDecompose}
              departments={departments}
            />
          )}

          {canOperateInProgress && (
            <WorkCompletePanel
              proof={proof}
              onProofChange={setProof}
              evidenceAttachments={(work.attachments || []).filter(a => a.category === 'evidence')}
              onUploadEvidence={handleUploadEvidence}
              onDeleteEvidence={handleDeleteEvidence}
              uploading={uploading}
              onComplete={handleComplete}
            />
          )}

          {canOperateInProgress && (
            <WorkAdjustCancelActions
              onAdjust={() => {
                router.push(`/${type}/${work.id}/adjust`);
              }}
              onCancel={() => {
                setCancelReason('');
                setIsCancelDialogOpen(true);
              }}
            />
          )}

          {canApprove && (
            <WorkflowApprovalPanel
              onApprove={handleApprove}
              onReject={handleReject}
              companyLeaders={companyLeaders}
              needsLeaderSelection={
                !!user &&
                user.role === 'DEPARTMENT_LEADER' &&
                !work?.proposedLeaderId &&
                !work?.approvalLeaderId
              }
              leaderName={work?.approvalLeader || work?.proposedLeader}
            />
          )}
        </aside>
      </div>

      <WorkActionDialogs
        isCancelDialogOpen={isCancelDialogOpen}
        setIsCancelDialogOpen={setIsCancelDialogOpen}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        approvalLeaderName={work.approvalLeader}
        proposedLeaderName={work.proposedLeader}
        onSubmitCancel={handleCancel}
      />
    </div>
  );
}
