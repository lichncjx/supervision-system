-- Phase 7: normalize business field names.
-- Current environments are test-only, so this migration keeps the structural target
-- simple and does not attempt production-grade data backfill.

ALTER TABLE "work_items" RENAME COLUMN "departmentIds" TO "responsibleDepartmentIds";

ALTER TABLE "work_items" ADD COLUMN "responsiblePerson" VARCHAR(50);

ALTER TABLE "work_items" DROP CONSTRAINT IF EXISTS "work_items_deptLeaderId_fkey";
ALTER TABLE "work_items" DROP CONSTRAINT IF EXISTS "work_items_deptManagerId_fkey";

ALTER TABLE "work_items" DROP COLUMN IF EXISTS "deptLeaderId";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "deptManagerId";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "supervisor";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "deptLeaderName";
ALTER TABLE "work_items" DROP COLUMN IF EXISTS "deptManagerName";
