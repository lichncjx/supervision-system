'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { WorkFullPageForm } from '@/features/works/ui/work-full-page-form';
import { useWorkDetailData } from '@/features/works/client/use-work-detail-data';
import { updateWork, resubmitRejectedWork } from '@/features/works/client/work-api';
import {
  canEditRegularDraftWork,
  canHandleReturnedDraftWork,
} from '@/features/works/client/work-client-permissions';
import type { WorkEditablePatch } from '@/features/works/client/work-client.types';

export default function EditWorkPage() {
  const params = useParams<{ type: string; id: string }>();
  const routeType = params?.type || 'todo';
  const id = params?.id || '';
  const router = useRouter();
  const { user } = useAuth();
  const { work, companyLeaders, departments } = useWorkDetailData(id);

  if (!work || !user) {
    return <div className="p-8 text-center text-slate-500">加载中...</div>;
  }

  const canEdit =
    user.role === 'ADMIN' ||
    canEditRegularDraftWork(user, work) ||
    canHandleReturnedDraftWork(user, work);

  if (!canEdit) {
    return <div className="p-8 text-center text-red-600">无权编辑该事项</div>;
  }

  const isReturned = canHandleReturnedDraftWork(user, work);

  const handleSubmit = async (patch: WorkEditablePatch) => {
    const nextPatch = {
      ...patch,
      title: patch.title || patch.workItem || work.title,
    };

    if (isReturned) {
      await resubmitRejectedWork(work, user, nextPatch);
      alert('已修改并重新提交审批');
    } else {
      await updateWork(work.id, nextPatch);
      alert('草稿已保存');
    }

    router.push(`/${routeType}/${work.id}`);
  };

  return (
    <WorkFullPageForm
      mode="edit"
      routeType={routeType}
      work={work}
      user={user}
      departments={departments}
      companyLeaders={companyLeaders}
      rejectReason={work.rejectReason}
      onSubmit={handleSubmit}
    />
  );
}
