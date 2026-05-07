/**
 * 附件权限统一判断模块（Phase 3B）。
 *
 * 所有附件上传、查看、下载、删除的权限判断集中在此，避免 upload / delete
 * / download 三处重复逻辑分叉导致前后端不一致。
 *
 * 规则优先级：
 *   1. ADMIN / SUPERVISOR → 全权限（查看、上传、删除所有附件）
 *   2. 上传者本人 → 可删除自己上传的附件
 *   3. deptManagerId → 查看 + 上传（含 rejected）+ 删除自己的附件，不可删他人
 *   4. 同部门 DEPT_MANAGER / DEPT_LEADER → 原有权限（上传、删除，rejected 除外）
 *   5. creatorId → 查看权限
 *   6. VICE_PRESIDENT / PRESIDENT → 查看权限（公司级可见）
 */

/** 权限判断所需的最简用户信息 */
export interface AttPermUser {
  id: number;
  role: string;
  departmentId: number;
}

/** 权限判断所需的最简事项信息 */
export interface AttPermWorkItem {
  departmentId: number | null;
  status: string;
  creatorId: number;
  type: string; // 'PRIORITY' | 'MAIN' | 'TODO'
  deptManagerId?: number | null;
}

/** 权限判断所需的最简附件信息 */
export interface AttPermAttachment {
  userId: number;
}

function isCompanyLevel(role: string): boolean {
  return (
    role === 'ADMIN' ||
    role === 'SUPERVISOR' ||
    role === 'VICE_PRESIDENT' ||
    role === 'PRESIDENT'
  );
}

// ---------------------------------------------------------------------------
// canViewAttachment — 查看 / 下载权限
// ---------------------------------------------------------------------------

export function canViewAttachment(
  user: AttPermUser,
  workItem: AttPermWorkItem,
): boolean {
  if (isCompanyLevel(user.role)) return true;
  if (workItem.creatorId === user.id) return true;
  if (workItem.departmentId === user.departmentId) return true;
  if (
    (workItem.type === 'PRIORITY' || workItem.type === 'MAIN') &&
    workItem.deptManagerId === user.id
  ) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// canUploadAttachment — 上传权限
// ---------------------------------------------------------------------------

export function canUploadAttachment(
  user: AttPermUser,
  workItem: AttPermWorkItem,
): boolean {
  // ADMIN / SUPERVISOR 全权限
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return true;

  // 终止态（completed / cancelled）一律禁止
  if (
    workItem.status === 'COMPLETED' ||
    workItem.status === 'CANCELLED'
  ) {
    return false;
  }

  // deptManagerId（重点/主要工作）：允许上传（含 rejected，用于退回后补充材料）
  if (
    (workItem.type === 'PRIORITY' || workItem.type === 'MAIN') &&
    workItem.deptManagerId === user.id
  ) {
    return true;
  }

  // VICE_PRESIDENT / PRESIDENT：不开放上传（保持原有行为）
  if (user.role === 'VICE_PRESIDENT' || user.role === 'PRESIDENT') {
    return false;
  }

  // 同部门 DEPT_MANAGER / DEPT_LEADER：原有权限（rejected 除外）
  if (
    (user.role === 'DEPARTMENT_MANAGER' || user.role === 'DEPARTMENT_LEADER') &&
    workItem.departmentId === user.departmentId
  ) {
    if (workItem.status === 'REJECTED') return false;
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// canDeleteAttachment — 删除权限
// ---------------------------------------------------------------------------
//
// 规则（Phase 3C 收紧后）：
//   1. ADMIN / SUPERVISOR → 可删除所有附件
//   2. 上传者本人 → 可删除自己上传的附件
//   3. 其他任何人（含同部门 DEPT_MANAGER / DEPT_LEADER、deptManagerId 非上传者）→ 禁止删除

export function canDeleteAttachment(
  user: AttPermUser,
  _workItem: AttPermWorkItem,
  attachment: AttPermAttachment,
): boolean {
  // ADMIN / SUPERVISOR 可删除所有附件
  if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') return true;

  // 上传者本人可删除自己的附件
  if (attachment.userId === user.id) return true;

  return false;
}
