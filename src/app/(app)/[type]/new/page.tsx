'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { CreateWorkForm } from '@/features/works/ui/create-work-form';

export default function NewWorkPage() {
  const params = useParams<{ type: string }>();
  const routeType = params?.type || 'todo';
  const { user } = useAuth();

  return <CreateWorkForm routeType={routeType} user={user} />;
}
