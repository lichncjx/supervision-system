'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  FileWarning,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ATTACHMENT_RECONCILIATION_GRACE_PERIOD_HOURS,
  cleanupAttachmentStorage,
  inspectAttachmentStorage,
} from '@/features/attachments/client/attachment-reconciliation-api'
import type { AttachmentFileReconciliationResult } from '@/features/attachments/contract/attachment-reconciliation.types'

const MAX_VISIBLE_PATHS = 50

function PathList({ paths }: { paths: string[] }) {
  const visiblePaths = paths.slice(0, MAX_VISIBLE_PATHS)
  const hiddenCount = paths.length - visiblePaths.length

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
      <ul className="space-y-1 font-mono text-xs text-slate-600">
        {visiblePaths.map((path) => (
          <li key={path} className="break-all">
            {path}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-2 text-xs text-slate-400">其余 {hiddenCount} 条路径未展开显示</p>
      )}
    </div>
  )
}

function ResultPaths({ result }: { result: AttachmentFileReconciliationResult }) {
  const groups = [
    {
      title: result.mode === 'apply' ? '本次清理候选' : '可清理候选',
      description: `没有数据库引用，且修改时间已超过 ${ATTACHMENT_RECONCILIATION_GRACE_PERIOD_HOURS} 小时`,
      paths: result.orphanCandidatePaths,
    },
    {
      title: '安全期内的无引用文件',
      description: '可能仍处于上传或事务提交过程中，本次不会删除',
      paths: result.recentOrphanPaths,
    },
    {
      title: '数据库引用但物理文件缺失',
      description: '仅告警，不会自动修改或删除数据库记录',
      paths: result.missingReferencedPaths,
    },
    {
      title: '数据库中的无效附件路径',
      description: '路径不属于附件存储目录，仅告警，不会自动处理',
      paths: result.invalidReferencedPaths,
    },
    ...(result.mode === 'apply' && result.failedDeletePaths.length > 0
      ? [
          {
            title: '删除失败的文件',
            description: '文件仍可能存在，请检查应用日志和存储权限后重新检查',
            paths: result.failedDeletePaths,
          },
        ]
      : []),
    ...(result.mode === 'apply' && result.missingCandidatePaths.length > 0
      ? [
          {
            title: '执行时已不存在的候选文件',
            description: '可能已被并发清理，本次没有重复计入实际删除数量',
            paths: result.missingCandidatePaths,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {groups
        .filter((group) => group.paths.length > 0)
        .map((group) => (
          <section key={group.title} className="space-y-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {group.title}（{group.paths.length}）
              </h3>
              <p className="text-xs text-slate-500">{group.description}</p>
            </div>
            <PathList paths={group.paths} />
          </section>
        ))}
    </div>
  )
}

export function AttachmentStorageMaintenance() {
  const [result, setResult] = useState<AttachmentFileReconciliationResult | null>(null)
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const canApply =
    result?.mode === 'dry-run' && result.orphanCandidatePaths.length > 0 && !isChecking

  const handleInspect = async () => {
    setError('')
    setResult(null)
    setIsChecking(true)
    try {
      setResult(await inspectAttachmentStorage())
    } catch (requestError) {
      setError((requestError as Error).message || '检查附件存储失败')
    } finally {
      setIsChecking(false)
    }
  }

  const handleApply = async () => {
    setError('')
    setIsApplying(true)
    try {
      setResult(await cleanupAttachmentStorage())
      setConfirmOpen(false)
      setConfirmed(false)
    } catch (requestError) {
      setError((requestError as Error).message || '清理附件存储失败')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50/70 text-blue-950">
        <ShieldCheck />
        <AlertTitle>只清理数据库没有引用的物理文件</AlertTitle>
        <AlertDescription className="text-blue-800">
          数据库附件记录不会被本功能修改。安全时间窗固定为
          {ATTACHMENT_RECONCILIATION_GRACE_PERIOD_HOURS} 小时，近期文件只告警、不删除。
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">存储对账</h2>
          <p className="text-sm text-slate-500">先执行只读检查，确认候选文件后才能清理。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInspect} disabled={isChecking || isApplying}>
            <RefreshCw className={isChecking ? 'animate-spin' : ''} />
            {isChecking ? '正在检查' : result ? '重新检查' : '开始检查'}
          </Button>
          <Button
            variant="destructive"
            disabled={!canApply || isApplying}
            onClick={() => {
              setError('')
              setConfirmed(false)
              setConfirmOpen(true)
            }}
          >
            <Trash2 />
            清理候选文件
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!result ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
            <HardDrive className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-700">尚未检查附件存储</p>
            <p className="mt-1 text-sm text-slate-500">检查过程不会删除文件，也不会修改数据库。</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="gap-3 py-4 shadow-none">
              <CardHeader className="px-4">
                <CardDescription className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  扫描文件
                </CardDescription>
                <CardTitle className="text-2xl">{result.scannedFileCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="gap-3 py-4 shadow-none">
              <CardHeader className="px-4">
                <CardDescription className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  数据库引用
                </CardDescription>
                <CardTitle className="text-2xl">{result.referencedFileCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="gap-3 py-4 border-amber-200 bg-amber-50/40 shadow-none">
              <CardHeader className="px-4">
                <CardDescription className="flex items-center gap-2 text-amber-700">
                  <FileWarning className="h-4 w-4" />
                  可清理候选
                </CardDescription>
                <CardTitle className="text-2xl text-amber-800">
                  {result.orphanCandidatePaths.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="gap-3 py-4 shadow-none">
              <CardHeader className="px-4">
                <CardDescription className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  安全期内
                </CardDescription>
                <CardTitle className="text-2xl">{result.recentOrphanPaths.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {result.mode === 'apply' && (
            <Alert
              variant={result.failedDeletePaths.length > 0 ? 'destructive' : 'default'}
              className={
                result.failedDeletePaths.length === 0
                  ? 'border-green-200 bg-green-50/70 text-green-950'
                  : undefined
              }
            >
              {result.failedDeletePaths.length > 0 ? <AlertTriangle /> : <CheckCircle2 />}
              <AlertTitle>清理执行完成</AlertTitle>
              <AlertDescription>
                实际删除 {result.deletedPaths.length} 个文件，执行时已不存在{' '}
                {result.missingCandidatePaths.length} 个，失败 {result.failedDeletePaths.length}{' '}
                个。系统会以尽力而为方式写入一条汇总操作日志；建议重新检查以确认当前存储状态。
              </AlertDescription>
            </Alert>
          )}

          <Card className="shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                <CardTitle>检查结果</CardTitle>
                <Badge variant="outline">
                  {result.mode === 'dry-run' ? '只读检查' : '清理结果'}
                </Badge>
              </div>
              <CardDescription>
                引用缺失 {result.missingReferencedPaths.length} 个，无效路径{' '}
                {result.invalidReferencedPaths.length} 个。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.orphanCandidatePaths.length === 0 &&
              result.recentOrphanPaths.length === 0 &&
              result.missingReferencedPaths.length === 0 &&
              result.invalidReferencedPaths.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  未发现需要处理或排查的附件文件。
                </div>
              ) : (
                <ResultPaths result={result} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isApplying) {
            setConfirmOpen(open)
            if (!open) setConfirmed(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清理孤儿附件文件？</AlertDialogTitle>
            <AlertDialogDescription>
              执行时服务端会重新扫描，而不是直接使用页面中的旧结果。系统只删除数据库无引用且超过
              {ATTACHMENT_RECONCILIATION_GRACE_PERIOD_HOURS} 小时的文件；该操作无法通过系统撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-red-200 bg-red-50/60 p-3">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              disabled={isApplying}
            />
            <span className="text-sm leading-5 text-red-800">
              我已核对检查结果，并确认删除符合条件的孤儿文件。
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmed || isApplying}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault()
                void handleApply()
              }}
            >
              {isApplying ? '正在清理' : '确认清理'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
