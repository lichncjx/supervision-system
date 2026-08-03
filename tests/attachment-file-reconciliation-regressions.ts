import assert from 'node:assert/strict'
import { planAttachmentFileReconciliation } from '@/features/attachments/application/reconcile-attachment-files.usecase'

const cutoff = new Date('2026-08-03T00:00:00.000Z')

const plan = planAttachmentFileReconciliation({
  referencedPaths: [
    'uploads/attachments/2026/08/referenced.txt',
    'uploads\\attachments\\2026\\08\\missing.txt',
    'outside-attachment-root.txt',
  ],
  storageFiles: [
    {
      relativePath: 'uploads/attachments/2026/08/referenced.txt',
      modifiedAt: new Date('2026-08-01T00:00:00.000Z'),
    },
    {
      relativePath: 'uploads/attachments/2026/08/old-orphan.txt',
      modifiedAt: new Date('2026-08-02T00:00:00.000Z'),
    },
    {
      relativePath: 'uploads/attachments/2026/08/recent-orphan.txt',
      modifiedAt: new Date('2026-08-03T00:00:00.001Z'),
    },
  ],
  cutoff,
})

assert.equal(plan.scannedFileCount, 3)
assert.equal(plan.referencedFileCount, 2)
assert.deepEqual(plan.orphanCandidatePaths, ['uploads/attachments/2026/08/old-orphan.txt'])
assert.deepEqual(plan.recentOrphanPaths, ['uploads/attachments/2026/08/recent-orphan.txt'])
assert.deepEqual(plan.missingReferencedPaths, ['uploads/attachments/2026/08/missing.txt'])
assert.deepEqual(plan.invalidReferencedPaths, ['outside-attachment-root.txt'])

console.log('attachment file reconciliation regressions passed')
