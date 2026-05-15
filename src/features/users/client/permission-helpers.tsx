'use client';

import React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { getRoleName } from '@/features/users/domain/role.rules';
import { Badge } from '@/components/ui/badge';

export function usePermission() {
  const { user } = useAuth();

  return {
    user,
    roleName: user ? getRoleName(user.role) : '',
    canViewAll: user ? ['ADMIN', 'SUPERVISOR', 'VICE_PRESIDENT', 'PRESIDENT'].includes(user.role) : false,
    canCreate: user ? ['ADMIN', 'SUPERVISOR', 'DEPARTMENT_MANAGER', 'DEPARTMENT_LEADER'].includes(user.role) : false,
    canApprove: user ? ['ADMIN', 'DEPARTMENT_LEADER', 'VICE_PRESIDENT', 'PRESIDENT'].includes(user.role) : false,
    isAdmin: user?.role === 'ADMIN',
    isCompanyLeader: user ? ['VICE_PRESIDENT', 'PRESIDENT'].includes(user.role) : false,
    isDepartmentLevel: user ? ['DEPARTMENT_MANAGER', 'DEPARTMENT_LEADER'].includes(user.role) : false,
  };
}

export function RoleBadge({ role }: { role: string }) {
  return <Badge variant="secondary">{getRoleName(role)}</Badge>;
}

export function PermissionGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string | string[];
}) {
  const { user } = useAuth();

  if (!user) return null;

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user.role)) return null;
  }

  return <>{children}</>;
}

export function PermissionInfo() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
      当前用户：{user.name} <RoleBadge role={user.role} />
    </div>
  );
}

export function DataScopeInfo() {
  const { user } = useAuth();
  if (!user) return null;

  const scope = ['admin', 'vice_president', 'president'].includes(user.role) ? '全公司' : '本部门';

  return (
    <div className="text-sm text-gray-500">
      数据范围：<span className="font-medium text-gray-700">{scope}</span>
    </div>
  );
}