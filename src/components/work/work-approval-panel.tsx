'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WorkApprovalPanelProps {
  visible: boolean;
  onApprove: () => void;
  onReject: () => void;
}

export function WorkApprovalPanel({ visible, onApprove, onReject }: WorkApprovalPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>审批操作</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-3">
        <Button onClick={onApprove}>
          审批通过
        </Button>
        <Button variant="destructive" onClick={onReject}>
          退回
        </Button>
      </CardContent>
    </Card>
  );
}
