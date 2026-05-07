'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
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
  canApproveWork,
  resubmitRejectedWork,
  deleteWork,
  getWorkflowRecords,
  submitWork,
  type WorkEditablePatch,
  type Work,
  type WorkflowRecord,
  getCurrentProcessDescription,
} from '@/lib/work-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkAttachmentPanel } from '@/components/work/work-attachment-panel';
import { WorkOperationPanel } from '@/components/work/work-operation-panel';
import { WorkWorkflowRecords } from '@/components/work/work-workflow-records';
import { WorkApprovalPanel } from '@/components/work/work-approval-panel';
import { WorkReturnedPanel } from '@/components/work/work-returned-panel';
import { WorkDecomposePanel } from '@/components/work/work-decompose-panel';
import { WorkActionDialogs } from '@/components/work/work-action-dialogs';
import { WorkPendingAdjustmentPanel } from '@/components/work/work-pending-adjustment-panel';
import { StatusBadge } from '@/components/common/badges';
import { WorkflowProgress } from '@/components/common/workflow-progress';
import { ExpandableText } from '@/components/common/expandable-text';

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
  // Phase 2: department leaders/managers for returned panel dropdowns
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

  // Phase 2: fetch department leaders/managers for priority/main returned panel
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
  }, [work?.departmentId, work?.type]);

  // 初始化编辑表单
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
        supervisor: work.supervisor || '',
        deptLeaderId: work.deptLeaderId ? String(work.deptLeaderId) : '',
        deptManagerId: work.deptManagerId ? String(work.deptManagerId) : '',
        proposedLeader: work.proposedLeader || '',
        proposedLeaderId: work.proposedLeaderId ? String(work.proposedLeaderId) : '',
        proposedLeaderRole: work.proposedLeaderRole || '',
        proposedScene: work.proposedScene || '',
        formedTime: work.formedTime || '',
        responsiblePerson: work.responsiblePerson || '',
        // Phase 4A: 数组字段，支持编辑时多部门/多责任人的 MultiSearchSelect
        departmentIds: work.departmentIds || [] as number[],
        responsiblePersons: work.responsiblePersons || [] as string[],
        cooperateDepartmentIds: work.cooperateDepartmentIds || [] as number[],
        cooperatePersons: work.cooperatePersons || [] as string[],
        cooperateDepartment: work.cooperateDepartment || '',
        cooperatePerson: work.cooperatePerson || '',
        workPlan: work.workPlan || '',
        planCompleteTime: work.planCompleteTime || '',
        progress: work.progress || '',
        nodes: work.nodes || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [work?.id, refresh]);

  if (!work) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">事项不存在</p>
        <Link href={`/${type}`}>
          <Button variant="link">返回列表</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUserRelatedDepartment = () => {
    if (!user?.departmentId) return false;

    if (work.departmentId === user.departmentId) return true;

    if (Array.isArray(work.departmentIds)) {
      return work.departmentIds.includes(user.departmentId);
    }

    if (Array.isArray(work.cooperateDepartmentIds)) {
      return work.cooperateDepartmentIds.includes(user.departmentId);
    }

    return false;
  };

  const canDecomposeTodo =
    user &&
    work.type === '待办' &&
    work.status === 'pending_decompose' &&
    (
      user.role === 'ADMIN' ||
      (
        (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
        isCurrentUserRelatedDepartment()
      )
    );

  const canHandleReturnedCreate =
    user &&
    work.status === 'rejected' &&
    (
      user.role === 'ADMIN' ||
      // firstSubmitterId ?? creatorId 的 fallback 仅用于兼容历史数据
      user.id === (work.firstSubmitterId ?? work.creatorId)
    );

  const canApprove = user ? canApproveWork(user, work) : false;

  const canEdit = user && (
    user.role === 'ADMIN' ||
    user.role === 'SUPERVISOR' ||
    (
      (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
      isCurrentUserRelatedDepartment() &&
      !['completed', 'cancelled', 'rejected'].includes(work.status)
    ) ||
    (
      // Phase 3B: deptManagerId（含 rejected，用于退回后补充材料）
      (work.type === '重点' || work.type === '主要') &&
      user.id === work.deptManagerId &&
      !['completed', 'cancelled'].includes(work.status)
    )
  );

  const canSubmitDraft = user && work.status === 'draft' && (
    user.role === 'ADMIN' ||
    user.id === work.creatorId
  );

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

  // 节点操作函数
  const updateNodeTitle = (nodeId: number, title: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, title } : node
      ),
    }));
  };

  const addNode = () => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: Date.now(),
          title: '',
          completeTime: '',
          children: [],
        },
      ],
    }));
  };

  const updateNodeCompleteTime = (nodeId: number, completeTime: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId ? { ...node, completeTime: completeTime } : node
      ),
    }));
  };

  const deleteNode = (nodeId: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.filter((node: any) => node.id !== nodeId),
    }));
  };

  const addSubNode = (nodeId: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: [
                ...node.children,
                {
                  id: Date.now(),
                  title: '',
                  completeTime: '',
                },
              ],
            }
          : node
      ),
    }));
  };

  const updateSubNodeTitle = (nodeId: number, subNodeId: number, title: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: node.children.map((child: any) =>
                child.id === subNodeId ? { ...child, title } : child
              ),
            }
          : node
      ),
    }));
  };

  const updateSubNodeCompleteTime = (nodeId: number, subNodeId: number, completeTime: string) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: node.children.map((child: any) =>
                child.id === subNodeId ? { ...child, completeTime: completeTime } : child
              ),
            }
          : node
      ),
    }));
  };

  const deleteSubNode = (nodeId: number, subNodeId: number) => {
    setEditForm((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: any) =>
        node.id === nodeId
          ? {
              ...node,
              children: node.children.filter((child: any) => child.id !== subNodeId),
            }
          : node
      ),
    }));
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

  const canDeleteAttachment = (attachment: { userId: number }): boolean => {
    if (!user) return false;
    // ADMIN / SUPERVISOR 可删除所有附件
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return true;
    // 上传者本人可删除自己上传的附件
    if (user.id === attachment.userId) return true;
    // 其他任何人不可删除他人附件
    return false;
  };

  const getDepartmentName = (id: number) => {
    return departments.find((d) => d.id === id)?.name || '-';
  };

  const isPriorityOrMain = work.type === '重点' || work.type === '主要';
  const isTodo = work.type === '待办';

  const renderPriorityOrMainInfo = () => {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">业务类别：</span>
            <span>{work.businessCategory || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">工作事项：</span>
            <span>{work.workItem || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">工作节点：</span>
            <span>{work.workNode || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">计划完成时间：</span>
            <span>{work.completeTime || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">完成形式：</span>
            <span>{work.completeForm || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">主办部门：</span>
            <span>{getDepartmentName(work.departmentId ?? 0)}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">部门领导：</span>
            <span>{work.deptLeaderName || work.responsibleLeader || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">主管人员：</span>
            <span>{work.deptManagerName || work.supervisor || '-'}</span>
          </div>
          {work.type === '重点' && (
            <div>
              <span className="text-sm text-gray-500">是否为创新工作：</span>
              <span>{work.isInnovation ? '是' : '否'}</span>
            </div>
          )}
          <div>
            <span className="text-sm text-gray-500">当前状态：</span>
            <StatusBadge status={work.status} />
          </div>
          <div>
            <span className="text-sm text-gray-500">当前环节：</span>
            <span className="text-blue-600">{getCurrentProcessDescription(
              work.status,
              work.currentApproverRole,
              work.currentApproverId
            )}</span>
          </div>
        </div>

        {work.rejectReason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
            <div>退回人：{work.rejectedBy || '-'}</div>
            <div>退回原因：{work.rejectReason}</div>
            {work.rejectedAt && (
              <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
            )}
          </div>
        )}

        <div>
          <p className="font-medium mb-2">工作节点：</p>
          {work.nodes && work.nodes.length > 0 ? (
            <div className="space-y-3">
              {work.nodes.map((node: any, index: number) => (
                <div key={node.id} className="border rounded p-3 bg-gray-50">
                  <div className="font-medium break-words">
                    {index + 1}. {node.title}
                    {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                  </div>
                  {node.children && node.children.length > 0 && (
                    <div className="pl-5 mt-2 space-y-1 text-sm text-gray-600">
                      {node.children.map((child: any, childIndex: number) => (
                        <div key={child.id} className="break-words">
                          {index + 1}.{childIndex + 1} {child.title}
                          {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">暂无工作节点</p>
          )}
        </div>

        {work.proof && (
          <div>
            <span className="text-sm text-gray-500">见证材料说明：</span>
            <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
          </div>
        )}
        {(() => {
          const evidenceAttachments = (work.attachments || []).filter(a => a.category === 'evidence');
          if (evidenceAttachments.length === 0) return null;
          return (
            <div>
              <span className="text-sm text-gray-500">见证材料附件：</span>
              <div className="mt-2 space-y-2">
                {evidenceAttachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium break-words">{att.fileName}</div>
                      <div className="text-xs text-gray-500">
                        上传人：{att.userName || '-'}
                        上传时间：{att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}
                      </div>
                    </div>
                    <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {work.adjustReason && (
          <div>
            <p className="break-words whitespace-pre-wrap overflow-hidden">
              调整原因：{work.adjustReason}
            </p>
          </div>
        )}
        {work.adjustNewTime && (
          <p>
            调整后时间：{work.adjustNewTime}
          </p>
        )}
        {work.adjustHistory && work.adjustHistory.length > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800 space-y-2">
            <div className="font-medium">调整记录</div>
            {work.adjustHistory.map((item) => (
              <div key={item.id} className="border-t border-purple-100 pt-2 first:border-t-0 first:pt-0">
                <div>调整原因：{item.reason || '-'}</div>
                <div>原计划完成时间：{item.fromTime || '-'}</div>
                <div>现计划完成时间：{item.toTime || '-'}</div>
                <div>审批人：{item.approvedBy || '-'}</div>
                <div>审批时间：{item.approvedAt ? new Date(item.approvedAt).toLocaleString() : '-'}</div>
              </div>
            ))}
          </div>
        )}
        {work.cancelReason && (
          <div>
            <span className="text-sm text-gray-500">取消原因：</span>
            <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
          </div>
        )}
      </div>
    );
  };

  const renderTodoInfo = () => {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">事项提出领导：</span>
            <span>{work.proposedLeader || '-'}</span>
            <span className="text-xs text-gray-400 ml-2">（提出该待办事项，默认也是审批领导）</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">事项提出场景：</span>
            <span>{work.proposedScene || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">待办事项：</span>
            <span>{work.workItem || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">形成时间：</span>
            <span>{work.formedTime || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">主责部门：</span>
            <span>
              {work.departmentIds && work.departmentIds.length > 0
                ? work.departmentIds.map((id: number) => getDepartmentName(id)).join('、')
                : getDepartmentName(work.departmentId ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-500">主责责任人：</span>
            <span>
              {work.responsiblePersons && work.responsiblePersons.length > 0
                ? work.responsiblePersons.join('、')
                : work.responsiblePerson || '-'}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-500">配合部门：</span>
            <span>
              {work.cooperateDepartmentIds && work.cooperateDepartmentIds.length > 0
                ? work.cooperateDepartmentIds.map((id: number) => getDepartmentName(id)).join('、')
                : work.cooperateDepartments && work.cooperateDepartments.length > 0
                ? work.cooperateDepartments.join('、')
                : work.cooperateDepartment || '-'}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-500">配合责任人：</span>
            <span>
              {work.cooperatePersons && work.cooperatePersons.length > 0
                ? work.cooperatePersons.join('、')
                : work.cooperatePerson || '-'}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-500">工作计划：</span>
            <span>{work.workPlan || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">计划完成时间：</span>
            <span>{work.planCompleteTime || '-'}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">进展情况：</span>
            <ExpandableText text={work.progress} />
          </div>
          <div>
            <span className="text-sm text-gray-500">当前状态：</span>
            <StatusBadge status={work.status} />
          </div>
          <div>
            <span className="text-sm text-gray-500">当前环节：</span>
            <span className="text-blue-600">{getCurrentProcessDescription(
              work.status,
              work.currentApproverRole,
              work.currentApproverId
            )}</span>
          </div>
        </div>

        {work.nodes && work.nodes.length > 0 && (
          <div>
            <p className="font-medium mb-2">任务分解节点：</p>
            <div className="space-y-3">
              {work.nodes.map((node: any, index: number) => (
                <div key={node.id} className="border rounded p-3 bg-gray-50">
                  <div className="font-medium break-words">
                    {index + 1}. {node.title}
                    {node.completeTime ? `（节点完成时间：${node.completeTime}）` : ''}
                  </div>
                  {node.children && node.children.length > 0 && (
                    <div className="pl-5 mt-2 space-y-1 text-sm text-gray-600">
                      {node.children.map((child: any, childIndex: number) => (
                        <div key={child.id} className="break-words">
                          {index + 1}.{childIndex + 1} {child.title}
                          {child.completeTime ? `（完成日期：${child.completeTime}）` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {work.rejectReason && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 break-words whitespace-pre-wrap">
            <div>退回人：{work.rejectedBy || '-'}</div>
            <div>退回原因：{work.rejectReason}</div>
            {work.rejectedAt && (
              <div>退回时间：{new Date(work.rejectedAt).toLocaleString()}</div>
            )}
          </div>
        )}

        {work.proof && (
          <div>
            <span className="text-sm text-gray-500">见证材料说明：</span>
            <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.proof}</p>
          </div>
        )}
        {(() => {
          const evidenceAttachments = (work.attachments || []).filter(a => a.category === 'evidence');
          if (evidenceAttachments.length === 0) return null;
          return (
            <div>
              <span className="text-sm text-gray-500">见证材料附件：</span>
              <div className="mt-2 space-y-2">
                {evidenceAttachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium break-words">{att.fileName}</div>
                      <div className="text-xs text-gray-500">
                        上传人：{att.userName || '-'}
                        上传时间：{att.uploadedAt ? new Date(att.uploadedAt).toLocaleString() : '-'}
                      </div>
                    </div>
                    <a href={`/api/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        下载
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        {work.adjustReason && (
          <div>
            <p className="break-words whitespace-pre-wrap overflow-hidden">
              调整原因：{work.adjustReason}
            </p>
          </div>
        )}
        {work.adjustNewTime && (
          <p>
            调整后时间：{work.adjustNewTime}
          </p>
        )}
        {work.cancelReason && (
          <div>
            <span className="text-sm text-gray-500">取消原因：</span>
            <p className="mt-1 p-2 bg-gray-50 rounded break-words whitespace-pre-wrap overflow-hidden">{work.cancelReason}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${type}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">事项详情</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{work.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPriorityOrMain && renderPriorityOrMainInfo()}
          {isTodo && renderTodoInfo()}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <WorkflowProgress work={work} />
        </CardContent>
      </Card>

      <WorkAttachmentPanel
        attachments={(work.attachments || []).filter(a => a.category !== 'evidence')}
        canUpload={!!canEdit}
        canDelete={canDeleteAttachment}
        onUpload={handleUploadAttachments}
        onDelete={handleDeleteAttachment}
      />

      <WorkReturnedPanel
        visible={!!canHandleReturnedCreate}
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
        updateNodeTitle={updateNodeTitle}
        updateNodeCompleteTime={updateNodeCompleteTime}
        deleteNode={deleteNode}
        addNode={addNode}
        addSubNode={addSubNode}
        updateSubNodeTitle={updateSubNodeTitle}
        updateSubNodeCompleteTime={updateSubNodeCompleteTime}
        deleteSubNode={deleteSubNode}
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
        visible={!!canDecomposeTodo}
        editForm={editForm}
        setEditForm={setEditForm}
        updateNodeTitle={updateNodeTitle}
        updateNodeCompleteTime={updateNodeCompleteTime}
        deleteNode={deleteNode}
        addNode={addNode}
        addSubNode={addSubNode}
        updateSubNodeTitle={updateSubNodeTitle}
        updateSubNodeCompleteTime={updateSubNodeCompleteTime}
        deleteSubNode={deleteSubNode}
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

      {canSubmitDraft && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">当前为草稿状态，请提交审批：</span>
              <Button onClick={handleSubmitDraft}>提交审批</Button>
            </div>
          </CardContent>
        </Card>
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
        visible={canApprove}
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
        updateNodeTitle={updateNodeTitle}
        updateNodeCompleteTime={updateNodeCompleteTime}
        deleteNode={deleteNode}
        addNode={addNode}
        addSubNode={addSubNode}
        updateSubNodeTitle={updateSubNodeTitle}
        updateSubNodeCompleteTime={updateSubNodeCompleteTime}
        deleteSubNode={deleteSubNode}
      />
    </div>
  );
}
