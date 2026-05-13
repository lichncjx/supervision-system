import type { User } from '@/lib/auth';
import type { Work } from '@/features/works/client/work-view.types';
import {
  canEditRegularDraftWork,
  canSubmitDraftWork,
  canHandleReturnedDraftWork,
  canDecomposeTodoWork,
  canApproveWork,
} from '@/features/works/client/work-client-permissions';
import { isWorkStatusTerminal, isReturnedDraftWork } from '@/lib/work-status';

export function useWorkDetailPermissions(
  work: Work | undefined,
  user: User | null | undefined,
) {
  if (!work) {
    return {
      canDecomposeTodo: false,
      canHandleReturnedCreate: false,
      canApprove: false,
      canEdit: false,
      canSubmitDraft: false,
      canEditDraft: false,
      canDeleteAttachment: () => false,
      isRegularDraft: false,
    };
  }

  const isAdmin = user?.role === 'ADMIN';
  const isSupervisor = user?.role === 'SUPERVISOR';

  // --- 委托给 work-client-permissions 原子函数的权限 ---

  const canEditDraft = isAdmin || canEditRegularDraftWork(user, work);
  const canSubmitDraft = isAdmin || canSubmitDraftWork(user, work);
  const canHandleReturnedCreate = isAdmin || canHandleReturnedDraftWork(user, work);
  const canDecomposeTodo = isAdmin || canDecomposeTodoWork(user, work);
  const canApprove = user ? canApproveWork(user, work) : false;

  // --- 详情页特有的宽口径权限 ---

  const isRelatedDept = (() => {
    if (!user?.departmentId) return false;
    if (work.departmentId === user.departmentId) return true;
    if (Array.isArray(work.cooperators)) {
      return work.cooperators.some((c: any) => c.departmentId === user.departmentId);
    }
    return false;
  })();

  const canEdit = user && (
    isAdmin ||
    isSupervisor ||
    (
      (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
      isRelatedDept &&
      !isWorkStatusTerminal(work.status) &&
      !isReturnedDraftWork(work)
    ) ||
    (
      (work.type === '重点' || work.type === '主要') &&
      isRelatedDept &&
      !isWorkStatusTerminal(work.status)
    )
  );

  const canDeleteAttachment = (attachment: { userId: number }): boolean => {
    if (!user) return false;
    if (isAdmin || isSupervisor) return true;
    if (user.id === attachment.userId) return true;
    return false;
  };

  const isRegularDraft = !!canEditDraft;

  return {
    canDecomposeTodo,
    canHandleReturnedCreate,
    canApprove,
    canEdit,
    canSubmitDraft,
    canEditDraft,
    canDeleteAttachment,
    isRegularDraft,
  };
}
