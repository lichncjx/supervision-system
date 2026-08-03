export interface AttachmentFileReconciliationPlan {
  scannedFileCount: number
  referencedFileCount: number
  orphanCandidatePaths: string[]
  recentOrphanPaths: string[]
  missingReferencedPaths: string[]
  invalidReferencedPaths: string[]
}

export interface AttachmentFileReconciliationResult extends AttachmentFileReconciliationPlan {
  mode: 'dry-run' | 'apply'
  deletedPaths: string[]
  failedDeletePaths: string[]
}
