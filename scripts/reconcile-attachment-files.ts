import {
  MIN_GRACE_PERIOD_HOURS,
  reconcileAttachmentFilesUseCase,
} from '@/features/attachments/application/reconcile-attachment-files.usecase'
import { prisma } from '@/shared/db/prisma'

function parseGracePeriodHours(args: string[]): number | undefined {
  const argument = args.find((value) => value.startsWith('--grace-hours='))
  if (!argument) return undefined

  const value = Number(argument.slice('--grace-hours='.length))
  if (!Number.isFinite(value) || value < MIN_GRACE_PERIOD_HOURS) {
    throw new Error(`--grace-hours must be at least ${MIN_GRACE_PERIOD_HOURS}`)
  }
  return value
}

async function main() {
  const args = process.argv.slice(2)
  const result = await reconcileAttachmentFilesUseCase({
    apply: args.includes('--apply'),
    gracePeriodHours: parseGracePeriodHours(args),
  })

  console.log(JSON.stringify(result, null, 2))

  if (result.failedDeletePaths.length > 0) {
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
