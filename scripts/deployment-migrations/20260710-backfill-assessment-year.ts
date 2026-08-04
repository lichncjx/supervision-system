import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const MIN_YEAR = 2000
const MAX_YEAR = 2100

function getArgument(name: string): string | null {
  const prefix = `--${name}=`
  const argument = process.argv.find((value) => value.startsWith(prefix))
  return argument ? argument.slice(prefix.length) : null
}

function printUsage() {
  console.error('用法：pnpm db:backfill-assessment-year -- --default-year=2026 --dry-run | --apply')
}

async function main() {
  const defaultYear = Number(getArgument('default-year'))
  const dryRun = process.argv.includes('--dry-run')
  const apply = process.argv.includes('--apply')

  if (!Number.isInteger(defaultYear) || defaultYear < MIN_YEAR || defaultYear > MAX_YEAR) {
    printUsage()
    throw new Error(`--default-year 必须是 ${MIN_YEAR} 到 ${MAX_YEAR} 之间的整数`)
  }
  if (dryRun === apply) {
    printUsage()
    throw new Error('必须且只能指定 --dry-run 或 --apply 之一')
  }

  const prisma = new PrismaClient()
  try {
    const pendingCount = await prisma.workItem.count({
      where: { assessmentYear: null },
    })

    if (dryRun) {
      console.log(`预检完成：${pendingCount} 条工作记录的年度为空，将回填为 ${defaultYear}。`)
      return
    }

    const result = await prisma.workItem.updateMany({
      where: { assessmentYear: null },
      data: { assessmentYear: defaultYear },
    })
    const remainingCount = await prisma.workItem.count({
      where: { assessmentYear: null },
    })

    console.log(
      `年度回填完成：更新 ${result.count} 条记录为 ${defaultYear}；剩余空年度 ${remainingCount} 条。`,
    )
    if (remainingCount > 0) {
      throw new Error('仍存在空年度记录，不能继续执行非空约束迁移')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
