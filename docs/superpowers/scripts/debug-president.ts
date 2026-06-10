import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const president = await p.user.findFirst({ where: { username: 'president' } })
  if (!president) { console.log('No president'); return }
  console.log('President id:', president.id)

  const all = await p.workItem.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, type: true, title: true, status: true,
      proposedLeaderId: true, approvalLeaderId: true, currentApproverId: true,
      currentApproverRole: true, needMainLeaderCancel: true, departmentId: true }
  })
  console.log('Total works:', all.length)

  // Server logic
  const serverVisible = all.filter(w =>
    w.proposedLeaderId === president.id ||
    w.approvalLeaderId === president.id ||
    w.currentApproverId === president.id
  )
  console.log('Server visible:', serverVisible.length)
  serverVisible.forEach(w => console.log(`  id=${w.id} type=${w.type} status=${w.status} title=${w.title} needMainLeaderCancel=${w.needMainLeaderCancel}`))

  // Contract logic
  const contractVisible = all.filter(w =>
    w.proposedLeaderId === president.id ||
    w.approvalLeaderId === president.id ||
    w.currentApproverId === president.id ||
    w.currentApproverRole === 'PRESIDENT' ||
    w.needMainLeaderCancel === true
  )
  console.log('Contract visible:', contractVisible.length)
  contractVisible.forEach(w => console.log(`  id=${w.id} type=${w.type} status=${w.status} title=${w.title} needMainLeaderCancel=${w.needMainLeaderCancel}`))

  await p.$disconnect()
}
main()
