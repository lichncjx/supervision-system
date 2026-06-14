// docs/superpowers/scripts/backfill-responsible-users.ts
// 独立执行：npx tsx docs/superpowers/scripts/backfill-responsible-users.ts
//
// 按优先级回填 responsibleLeaderUserId / responsiblePersonUserId：
// 1. responsibleLeaderMemberId -> Member.userId -> responsibleLeaderUserId
// 2. responsiblePersonMemberId -> Member.userId -> responsiblePersonUserId
// 3. responsibleLeader 姓名匹配 User.name -> responsibleLeaderUserId
// 4. responsiblePerson 姓名匹配 User.name -> responsiblePersonUserId
// 5. 仅匹配到唯一 isActive=true 的 User 时自动回填
// 6. 回填成功后同步姓名快照

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface UnfilledEntry {
  id: number
  name: string
}

interface AmbiguousEntry {
  id: number
  name: string
  matches: string[]
}

interface InactiveMatchEntry {
  id: number
  name: string
  matchedUserId: number
  matchedName: string
}

interface BackfillReport {
  autoFilledLeader: number
  autoFilledPerson: number
  unfilledLeader: UnfilledEntry[]
  unfilledPerson: UnfilledEntry[]
  ambiguousLeader: AmbiguousEntry[]
  ambiguousPerson: AmbiguousEntry[]
  inactiveMatchesLeader: InactiveMatchEntry[]
  inactiveMatchesPerson: InactiveMatchEntry[]
}

async function main() {
  const report: BackfillReport = {
    autoFilledLeader: 0,
    autoFilledPerson: 0,
    unfilledLeader: [],
    unfilledPerson: [],
    ambiguousLeader: [],
    ambiguousPerson: [],
    inactiveMatchesLeader: [],
    inactiveMatchesPerson: [],
  }

  // ── Step 1-2: Member.userId chain ──
  const viaMember = await prisma.$queryRaw<
    Array<{
      id: number
      responsibleLeaderMemberId: number | null
      responsiblePersonMemberId: number | null
      leaderUserId: number | null
      leaderName: string | null
      personUserId: number | null
      personName: string | null
    }>
  >`
    SELECT
      w.id,
      w."responsibleLeaderMemberId",
      w."responsiblePersonMemberId",
      lm."userId" AS "leaderUserId",
      lu.name AS "leaderName",
      pm."userId" AS "personUserId",
      pu.name AS "personName"
    FROM "work_items" w
    LEFT JOIN "members" lm ON lm.id = w."responsibleLeaderMemberId"
    LEFT JOIN "users" lu ON lu.id = lm."userId" AND lu."isActive" = true
    LEFT JOIN "members" pm ON pm.id = w."responsiblePersonMemberId"
    LEFT JOIN "users" pu ON pu.id = pm."userId" AND pu."isActive" = true
    WHERE (w."responsibleLeaderMemberId" IS NOT NULL
       OR w."responsiblePersonMemberId" IS NOT NULL)
      AND (w."responsibleLeaderUserId" IS NULL
       OR w."responsiblePersonUserId" IS NULL)
  `

  for (const row of viaMember) {
    const data: Record<string, unknown> = {}
    if (row.leaderUserId && row.leaderName) {
      data.responsibleLeaderUserId = row.leaderUserId
      data.responsibleLeader = row.leaderName
      report.autoFilledLeader++
    }
    if (row.personUserId && row.personName) {
      data.responsiblePersonUserId = row.personUserId
      data.responsiblePerson = row.personName
      report.autoFilledPerson++
    }
    if (Object.keys(data).length > 0) {
      await prisma.workItem.update({ where: { id: row.id }, data })
    }
  }

  // ── Step 3-4: Name matching (only for items where userId is still null) ──
  const viaName = await prisma.$queryRaw<
    Array<{
      id: number
      responsibleLeader: string | null
      responsiblePerson: string | null
      responsibleLeaderUserId: number | null
      responsiblePersonUserId: number | null
    }>
  >`
    SELECT
      id,
      "responsibleLeader",
      "responsiblePerson",
      "responsibleLeaderUserId",
      "responsiblePersonUserId"
    FROM "work_items"
    WHERE ("responsibleLeaderUserId" IS NULL
       AND "responsibleLeader" IS NOT NULL
       AND "responsibleLeader" != '')
       OR ("responsiblePersonUserId" IS NULL
       AND "responsiblePerson" IS NOT NULL
       AND "responsiblePerson" != '')
  `

  for (const row of viaName) {
    // ── Match leader by name ──
    if (!row.responsibleLeaderUserId && row.responsibleLeader) {
      const activeMatches = await prisma.user.findMany({
        where: { name: row.responsibleLeader, isActive: true },
        select: { id: true, name: true },
      })
      if (activeMatches.length === 1) {
        await prisma.workItem.update({
          where: { id: row.id },
          data: { responsibleLeaderUserId: activeMatches[0].id },
        })
        report.autoFilledLeader++
      } else if (activeMatches.length > 1) {
        report.ambiguousLeader.push({
          id: row.id,
          name: row.responsibleLeader,
          matches: activeMatches.map((m) => m.name),
        })
      } else {
        const inactiveMatches = await prisma.user.findMany({
          where: { name: row.responsibleLeader, isActive: false },
          select: { id: true, name: true },
        })
        if (inactiveMatches.length > 0) {
          report.inactiveMatchesLeader.push({
            id: row.id,
            name: row.responsibleLeader,
            matchedUserId: inactiveMatches[0].id,
            matchedName: inactiveMatches[0].name,
          })
        } else {
          report.unfilledLeader.push({
            id: row.id,
            name: row.responsibleLeader,
          })
        }
      }
    }

    // ── Match person by name ──
    if (!row.responsiblePersonUserId && row.responsiblePerson) {
      const activeMatches = await prisma.user.findMany({
        where: { name: row.responsiblePerson, isActive: true },
        select: { id: true, name: true },
      })
      if (activeMatches.length === 1) {
        await prisma.workItem.update({
          where: { id: row.id },
          data: { responsiblePersonUserId: activeMatches[0].id },
        })
        report.autoFilledPerson++
      } else if (activeMatches.length > 1) {
        report.ambiguousPerson.push({
          id: row.id,
          name: row.responsiblePerson,
          matches: activeMatches.map((m) => m.name),
        })
      } else {
        const inactiveMatches = await prisma.user.findMany({
          where: { name: row.responsiblePerson, isActive: false },
          select: { id: true, name: true },
        })
        if (inactiveMatches.length > 0) {
          report.inactiveMatchesPerson.push({
            id: row.id,
            name: row.responsiblePerson,
            matchedUserId: inactiveMatches[0].id,
            matchedName: inactiveMatches[0].name,
          })
        } else {
          report.unfilledPerson.push({
            id: row.id,
            name: row.responsiblePerson,
          })
        }
      }
    }
  }

  // ── Print report ──
  console.log('=== 回填报告 ===')
  console.log(`责任领导自动回填成功: ${report.autoFilledLeader}`)
  console.log(`责任人自动回填成功: ${report.autoFilledPerson}`)

  if (report.unfilledLeader.length > 0) {
    console.log(
      `\n--- 责任领导未匹配 (${report.unfilledLeader.length}) ---`,
    )
    for (const u of report.unfilledLeader) {
      console.log(`  workItemId=${u.id}  name="${u.name}"`)
    }
  }

  if (report.unfilledPerson.length > 0) {
    console.log(
      `\n--- 责任人未匹配 (${report.unfilledPerson.length}) ---`,
    )
    for (const u of report.unfilledPerson) {
      console.log(`  workItemId=${u.id}  name="${u.name}"`)
    }
  }

  if (report.ambiguousLeader.length > 0) {
    console.log(
      `\n--- 责任领导重名/多匹配 (${report.ambiguousLeader.length}) ---`,
    )
    for (const a of report.ambiguousLeader) {
      console.log(
        `  workItemId=${a.id}  name="${a.name}"  matches=[${a.matches.join(', ')}]`,
      )
    }
  }

  if (report.ambiguousPerson.length > 0) {
    console.log(
      `\n--- 责任人重名/多匹配 (${report.ambiguousPerson.length}) ---`,
    )
    for (const a of report.ambiguousPerson) {
      console.log(
        `  workItemId=${a.id}  name="${a.name}"  matches=[${a.matches.join(', ')}]`,
      )
    }
  }

  if (report.inactiveMatchesLeader.length > 0) {
    console.log(
      `\n--- 责任领导匹配到非活跃用户 (${report.inactiveMatchesLeader.length}) ---`,
    )
    for (const i of report.inactiveMatchesLeader) {
      console.log(
        `  workItemId=${i.id}  name="${i.name}"  matchedUserId=${i.matchedUserId}  matchedName="${i.matchedName}" (inactive)`,
      )
    }
  }

  if (report.inactiveMatchesPerson.length > 0) {
    console.log(
      `\n--- 责任人匹配到非活跃用户 (${report.inactiveMatchesPerson.length}) ---`,
    )
    for (const i of report.inactiveMatchesPerson) {
      console.log(
        `  workItemId=${i.id}  name="${i.name}"  matchedUserId=${i.matchedUserId}  matchedName="${i.matchedName}" (inactive)`,
      )
    }
  }

  console.log('\n=== 回填完成 ===')
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
