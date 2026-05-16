'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
import { WorkDraftEditPanel } from '@/features/works/ui/work-draft-edit-panel';
import { WorkDisplayInfo } from '@/features/works/ui/work-display-info';
import { WorkDecomposePanel } from '@/features/works/ui/work-decompose-panel';
import { WorkActionDialogs } from '@/features/works/ui/work-action-dialogs';
import { WorkPendingAdjustmentPanel } from '@/features/works/ui/work-pending-adjustment-panel';
import { WorkSidebarActions } from '@/features/works/ui/work-sidebar-actions';
import { WorkflowProgress } from '@/features/workflow/ui/workflow-progress';
import { useWorkDetailData } from '@/features/works/client/use-work-detail-data';
import { uploadFiles, deleteAttachment } from '@/features/attachments/client/attachment-api';
import {
  canEditRegularDraftWork,
  canSubmitDraftWork,
  canHandleReturnedDraftWork,
  canDecomposeTodoWork,
  canApproveWork,
} from '@/features/works/client/work-client-permissions';
import { isWorkStatusTerminal, isReturnedDraftWork, isWorkStatusInProgress } from '@/features/works/domain/work-status.rules';
import { isWorkRelatedToDepartment } from '@/features/works/client/work-filters';
import { updateWork, deleteWork, resubmitRejectedWork } from '@/features/works/client/work-api';
import {
  submitWork,
  submitComplete,
  submitAdjust,
  submitCancel,
  submitTodoDecomposition,
  approveWork,
  rejectWork,
} from '@/features/workflow/client/workflow-api';
import type { WorkEditablePatch } from '@/features/works/client/work-view.types';

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
  } = useWorkDetailData(id);

  useEffect(() => {
    if (companyLeaders.length > 0 && !approvalLeaderId) {
      setApprovalLeaderId(String(companyLeaders[0].id));
    }
  }, [companyLeaders, approvalLeaderId]);

  React.useEffect(() => {
    if (work) {
      setEditForm({
        title: work.title || '',
        workItem: work.workItem || work.title || '',
        description: work.description || '',
        businessCategory: work.businessCategory || '',
        isInnovation: !!work.isInnovation,
        completeForm: work.completeForm || '',
        departmentId: work.departmentId,
        responsibleLeader: work.responsibleLeader || '',
        responsiblePerson: work.responsiblePerson || '',
        responsibleLeaderMemberId: work.responsibleLeaderMemberId,
        responsiblePersonMemberId: work.responsiblePersonMemberId,
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
  const canEditDraft = isAdmin || canEditRegularDraftWork(user, work);
  const canSubmitDraft = isAdmin || canSubmitDraftWork(user, work);
  const canHandleReturnedCreate = isAdmin || canHandleReturnedDraftWork(user, work);
  const canDecomposeTodo = isAdmin || canDecomposeTodoWork(user, work);
  const canApprove = user ? canApproveWork(user, work) : false;

  const isRelatedDept = isWorkRelatedToDepartment(work, user?.departmentId);
  const canEdit = user && (
    isAdmin || isSupervisor ||
    ((user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
      isRelatedDept && !isWorkStatusTerminal(work.status) && !isReturnedDraftWork(work)) ||
    ((work.type === '重点' || work.type === '主要') && isRelatedDept && !isWorkStatusTerminal(work.status))
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
        ? companyLeaders.find((l) => l.id === Number(editForm.proposedLeaderId))
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
    const leader = companyLeaders.find((l) => l.id === Number(approvalLeaderId));
    if (!leader) {
      alert('请选择公司审批领导');
      return;
    }
    const pendingAdjustment: WorkEditablePatch = {
      ...editForm,
      title: editForm.workItem || editForm.title || work.title,
    };
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
    const leader = companyLeaders.find((l) => l.id === Number(approvalLeaderId));
    if (!leader) {
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
      await submitTodoDecomposition(work, user, { ...editForm, title: editForm.workItem || work.title });
      onRefresh();
      alert('已提交待办事项分解，等待审批');
    } catch (error) {
      console.error(error);
      alert('提交失败，请查看控制台错误');
    }
  };

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

  const isPriorityOrMain = work.type === '重点' || work.type === '主要';
  const isTodo = work.type === '待办';
  const isDepartmentUser = user?.role === 'DEPARTMENT_MANAGER' || user?.role === 'DEPARTMENT_LEADER';
  const deptOptions = isDepartmentUser
    ? departments.filter((d) => d.id === user?.departmentId)
    : departments;
  const typeColorKey = work.type === '重点' ? 'priority' : work.type === '主要' ? 'main' : 'todo';

  const theme = TYPE_THEME[typeColorKey];
  const detailTheme = DETAIL_THEME[typeColorKey];

  const buildEditFormFromWork = () => ({
    title: work.title || '', workItem: work.workItem || work.title || '',
    businessCategory: work.businessCategory || '', isInnovation: !!work.isInnovation,
    completeForm: work.completeForm || '',
    departmentId: work.departmentId, responsibleLeader: work.responsibleLeader || '',
    responsiblePerson: work.responsiblePerson || '',
    responsibleLeaderMemberId: work.responsibleLeaderMemberId,
    responsiblePersonMemberId: work.responsiblePersonMemberId,
    proposedLeader: work.proposedLeader || '',
    proposedLeaderId: work.proposedLeaderId ? String(work.proposedLeaderId) : '',
    proposedLeaderRole: work.proposedLeaderRole || '', proposedScene: work.proposedScene || '',
    formedTime: work.formedTime || '', cooperators: work.cooperators || [],
    workPlan: work.workPlan || '', planCompleteTime: work.planCompleteTime || '',
    progress: work.progress || '', nodes: work.nodes || [],
  });

  const showSidebarCooperators = isTodo && !canEditDraft && !canHandleReturnedCreate;

  return (
    <div className="space-y-6">
      {/* Light Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-white px-5 py-4">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-[0.07]" style={{ backgroundImage: `linear-gradient(135deg, ${theme.accentHex}33, transparent 60%)` }} />
        <div className={`absolute inset-x-0 top-0 h-[3px] rounded-t-2xl ${theme.accent}`} />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <Link href={`/${type}`}>
              <Button variant="outline" size="sm" className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
                返回列表
              </Button>
            </Link>

            <h1 className="flex items-center gap-3 text-2xl font-bold leading-tight text-slate-900">
              <span className={`h-8 w-1 rounded-full ${theme.accent}`} />
              {work.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={work.status} work={work} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/80 px-3 py-1 text-xs font-medium text-slate-600">
              {getCurrentProcessDescription(work.status, work.currentApproverRole, work.currentApproverId)}
            </span>
          </div>
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
          <div className={`${PANEL_PADDED}`}>
            <WorkDisplayInfo work={work} departments={departments} hideNodes={true} hideCooperators={isTodo} />
          </div>

          {work.nodes && work.nodes.length > 0 && (
            <div className={PANEL_PADDED}>
              <h3 className="text-sm font-semibold text-slate-500 tracking-wide mb-4">
                {isTodo ? '任务分解节点' : '工作节点'}
              </h3>
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                {work.nodes.map((node: any, index: number) => {
                  const isLast = index === work.nodes!.length - 1;
                  return (
                    <div key={node.id ?? index} className={`relative ${isLast ? '' : 'pb-5'}`}>
                      <div className="absolute left-[-13px] top-[5px] h-[9px] w-[9px] rounded-full border-2 border-slate-300 bg-white" />
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-sm font-medium text-slate-800 break-words">
                          {node.title}
                        </div>
                        {node.completeTime && (
                          <span className="text-xs text-slate-400 shrink-0">{node.completeTime}</span>
                        )}
                      </div>
                      {node.children && node.children.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {node.children.map((child: any, childIndex: number) => (
                            <div key={child.id ?? `${index}-${childIndex}`} className="flex items-baseline justify-between gap-2 pl-3">
                              <div className="text-xs text-slate-500 break-words">
                                <span className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle bg-slate-200" />
                                {child.title}
                              </div>
                              {child.completeTime && (
                                <span className="text-xs text-slate-400 shrink-0">{child.completeTime}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                  <p className="text-xs text-slate-500 mt-0.5">提交后将由系统按工作流规则自动分配审批节点；责任领导、责任人仅用于业务留痕。</p>
                </div>
                <Button onClick={handlePropose} className={`rounded-full ${theme.button} border-0`}>
                  提交审批
                </Button>
              </div>
            </div>
          )}

          <WorkflowApprovalPanel visible={canApprove} onApprove={handleApprove} onReject={handleReject} />
          <WorkPendingAdjustmentPanel work={work} />
          <WorkflowRecords records={workflowRecords} />
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-2 space-y-4">
          <WorkAttachmentPanel
            attachments={(work.attachments || []).filter(a => a.category !== 'evidence')}
            canUpload={!!canEdit}
            canDelete={canDeleteAttachment}
            onUpload={handleUploadAttachments}
            onDelete={handleDeleteAttachment}
          />

          <WorkDraftEditPanel
            visible={!!canHandleReturnedCreate || !!canEditDraft}
            rejectReason={work.rejectReason || ''}
            editMode={editMode}
            setEditMode={setEditMode}
            editForm={editForm}
            setEditForm={setEditForm}
            editReason={editReason}
            setEditReason={setEditReason}
            isPriorityOrMain={isPriorityOrMain}
            isTodo={isTodo}
            departments={deptOptions}
            companyLeaders={companyLeaders}
            departmentLeaders={departmentLeaders}
            departmentManagers={departmentManagers}
            onResubmit={handleResubmit}
            onSaveDraft={handleSaveDraft}
            isRegularDraft={canEditDraft}
            onDelete={handleDelete}
          />

          <WorkDecomposePanel
            visible={!!canDecomposeTodo}
            editForm={editForm}
            setEditForm={setEditForm}
            rejectReason={work.rejectReason || ''}
            isReturned={!!(work.status === 'pending_decompose' && (work.rejectReason || work.rejectedFromStatus))}
            onSubmitDecomposition={handleDecompose}
          />

          {/* Read-only cooperators */}
          {showSidebarCooperators && work.cooperators && work.cooperators.length > 0 && (
            <div className={PANEL_PADDED}>
              <h3 className="text-sm font-semibold text-slate-500 tracking-wide mb-3">配合方</h3>
              <div className="space-y-2">
                {work.cooperators.map((c: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 bg-slate-50/70 rounded-lg p-3 text-sm">
                    <div className="font-medium">{c.departmentName || departments.find(d => d.id === c.departmentId)?.name || String(c.departmentId)}</div>
                    {(c.leader || c.person) && (
                      <div className="text-xs text-slate-500 mt-1">
                        {c.leader && <span>领导：{c.leader}</span>}
                        {c.leader && c.person && <span className="mx-2">|</span>}
                        {c.person && <span>责任人：{c.person}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isWorkStatusInProgress(work.status) && (
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

          <WorkSidebarActions
            visible={isWorkStatusInProgress(work.status)}
            onAdjust={() => {
              setEditForm(buildEditFormFromWork());
              setAdjustReason('');
              setIsAdjustDialogOpen(true);
            }}
            onCancel={() => {
              setCancelReason('');
              setIsCancelDialogOpen(true);
            }}
          />
        </aside>
      </div>

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
        departments={deptOptions}
        isPriorityOrMain={isPriorityOrMain}
        isTodo={isTodo}
        onSubmitAdjust={handleAdjust}
        onSubmitCancel={handleCancel}
      />
    </div>
  );
}
