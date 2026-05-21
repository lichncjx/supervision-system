"use client";

import { Badge } from "@/components/ui/badge";
import {
  getWorkStatusBadgeClass,
  getWorkDisplayStatusLabel,
  type ReturnedDraftLike,
} from "@/features/works/domain/work-status.rules";

export function getStatusColor(status: string): string {
  return getWorkStatusBadgeClass(status);
}

interface StatusBadgeProps {
  status: string;
  work?: ReturnedDraftLike;
}

export function StatusBadge({ status, work }: StatusBadgeProps) {
  return (
    <Badge className={getStatusColor(status)}>
      {getWorkDisplayStatusLabel(status, work)}
    </Badge>
  );
}
