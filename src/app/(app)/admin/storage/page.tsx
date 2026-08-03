'use client'

import Link from 'next/link'
import { ArrowLeft, HardDrive } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { AttachmentStorageMaintenance } from '@/features/attachments/ui/attachment-storage-maintenance'

export default function AdminStoragePage() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="p-8 text-center">加载中...</div>
  }

  if (!user || user.role !== 'ADMIN') {
    return <div className="p-8 text-center text-red-600">无权限访问附件存储维护</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          aria-label="返回系统管理"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
          <span className="h-6 w-1 rounded-full bg-amber-500" />
          <HardDrive className="h-6 w-6 text-amber-600" />
          附件存储维护
        </h1>
      </div>

      <AttachmentStorageMaintenance />
    </div>
  )
}
