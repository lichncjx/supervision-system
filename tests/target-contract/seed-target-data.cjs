require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const {
  departments,
  users,
  buildWorkItems,
} = require('./target-contract-data.cjs');
const {
  assertLocalOrTestEnvironment,
  assertResetConfirmed,
  assertSafeDatabaseUrl,
  printEnvironmentSummary,
} = require('./target-contract-safety.cjs');

const prisma = new PrismaClient();
const defaultPassword = '123456';

async function clearData() {
  await prisma.attachment.deleteMany();
  await prisma.workflowRecord.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.operationLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
}

async function seedDepartments() {
  const byKey = {};
  for (const item of departments) {
    const department = await prisma.department.create({
      data: {
        name: item.name,
        code: item.code,
        isBusiness: item.isBusiness,
      },
    });
    byKey[item.key] = department;
  }
  return byKey;
}

async function seedUsers(deptByKey) {
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const byKey = {};

  for (const item of users) {
    const user = await prisma.user.create({
      data: {
        username: item.username,
        passwordHash,
        name: item.name,
        role: item.role,
        departmentId: deptByKey[item.departmentKey].id,
        isActive: true,
      },
    });
    byKey[item.key] = user;
  }

  return byKey;
}

async function seedWorks(deptByKey, userByKey) {
  const scenarios = buildWorkItems({ dept: deptByKey, user: userByKey });
  const created = [];

  for (const scenario of scenarios) {
    const work = await prisma.workItem.create({
      data: scenario.data,
    });
    created.push({ ...scenario, id: work.id, targetStatus: work.status });
  }

  return created;
}

async function main() {
  printEnvironmentSummary('[target-contract-seed]');
  assertLocalOrTestEnvironment();
  assertSafeDatabaseUrl();
  assertResetConfirmed();

  console.log('[target-contract-seed] clearing test data...');
  await clearData();

  console.log('[target-contract-seed] creating fixed departments...');
  const deptByKey = await seedDepartments();

  console.log('[target-contract-seed] creating fixed role users...');
  const userByKey = await seedUsers(deptByKey);

  console.log('[target-contract-seed] creating target-contract work items...');
  const works = await seedWorks(deptByKey, userByKey);

  console.log('[target-contract-seed] done');
  console.log(JSON.stringify({
    departments: Object.fromEntries(Object.entries(deptByKey).map(([key, value]) => [key, value.id])),
    users: Object.fromEntries(Object.entries(userByKey).map(([key, value]) => [key, value.id])),
    works: works.map((work) => ({
      key: work.key,
      id: work.id,
      targetStatus: work.targetStatus,
    })),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[target-contract-seed] failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
