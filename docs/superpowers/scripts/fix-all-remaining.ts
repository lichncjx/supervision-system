import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  // Get all test users
  const deptLeaderA = await prisma.user.findFirst({ where: { username: 'dept_leader_a' }, select: { id: true, name: true } })
  const deptManagerA1 = await prisma.user.findFirst({ where: { username: 'dept_manager_a1' }, select: { id: true, name: true } })
  const deptManagerB1 = await prisma.user.findFirst({ where: { username: 'dept_manager_b1' }, select: { id: true, name: true } })

  if (!deptLeaderA || !deptManagerA1 || !deptManagerB1) { console.log('Missing users'); return }

  // Map every unfilled leader to dept_leader_a, every unfilled person to dept_manager_a1 (or b1 for 业务主责人B)
  const unfilled = await prisma.workItem.findMany({
    where: {
      OR: [
        { responsibleLeaderUserId: null, responsibleLeader: { not: null } },
        { responsiblePersonUserId: null, responsiblePerson: { not: null } },
      ],
    },
  })

  for (const w of unfilled) {
    const data: Record<string, unknown> = {}
    if (!w.responsibleLeaderUserId && w.responsibleLeader) {
      data.responsibleLeaderUserId = deptLeaderA.id
    }
    if (!w.responsiblePersonUserId && w.responsiblePerson) {
      data.responsiblePersonUserId = w.responsiblePerson === '业务主责人B' ? deptManagerB1.id : deptManagerA1.id
    }
    if (Object.keys(data).length > 0) {
      await prisma.workItem.update({ where: { id: w.id }, data })
      console.log(`  id=${w.id} leader→${data.responsibleLeaderUserId ?? '-'} person→${data.responsiblePersonUserId ?? '-'}`)
    }
  }

  const remaining = await prisma.workItem.count({
    where: {
      OR: [
        { responsibleLeaderUserId: null, responsibleLeader: { not: null } },
        { responsiblePersonUserId: null, responsiblePerson: { not: null } },
      ],
    },
  })
  console.log(`\nRemaining unfilled: ${remaining}`)
  await prisma.$disconnect()
}
main()
