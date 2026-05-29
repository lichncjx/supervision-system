'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { EditWorkForm } from '@/features/works/ui/edit-work-form';
import { useWorkDetailData } from '@/features/works/client/use-work-detail-data';
import { submitAdjust } from '@/features/workflow/client/workflow-api';
import { isInProgress } from '@/features/works/domain/work-status.rules';
import { isOwnedBy } from '@/features/works/client/work-client-permissions';
import type { WorkEditablePatch } from '@/features/works/client/work-client.types';

export default function AdjustWorkPage() {
  const params = useParams<{ type: string; id: string }>();
  const routeType = params?.type || 'todo';
  const id = params?.id || '';
  const router = useRouter();
  const { user } = useAuth();
  const { work, companyLeaders, departments } = useWorkDetailData(id);

  if (!work || !user) {
    return <div className="p-8 text-center text-slate-500">加载中...</div>;
  }

  const canAdjust =
    isInProgress(work.status) &&
    user.role !== 'ADMIN' &&
    user.role !== 'SUPERVISOR' &&
    isOwnedBy(user, work);

  if (!canAdjust) {
    return <div className="p-8 text-center text-red-600">无权申请调整该事项</div>;
  }

  const handleSubmit = async (patch: WorkEditablePatch, reason: string) => {
    await submitAdjust(work, reason, patch);
    alert('已提交调整申请，等待审批');
    router.push(`/${routeType}/${work.id}`);
  };

  return (
    <EditWorkForm
      mode="adjust"
      routeType={routeType}
      work={work}
      user={user}
      departments={departments}
      companyLeaders={companyLeaders}
      onSubmit={handleSubmit}
    />
  );
}
