const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDB() {
  console.log('正在清理数据库...');
  await prisma.operationLog.deleteMany();
  await prisma.workflowRecord.deleteMany();
  await prisma.workItem.deleteMany();
  console.log('数据库清理完成！');
  await prisma.$disconnect();
}

resetDB().catch(console.error);
