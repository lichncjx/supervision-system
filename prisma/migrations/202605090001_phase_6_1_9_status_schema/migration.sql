-- Phase 6.1 adopts clean rebuild plan A for test data.
-- This migration replaces WorkItemStatus with the target 9-state enum and
-- adds approval helper fields used by the later workflow PR.

CREATE TYPE "ApprovalType" AS ENUM (
  'propose',
  'adjust',
  'cancel',
  'complete'
);

ALTER TYPE "WorkItemStatus" RENAME TO "WorkItemStatus_old";

CREATE TYPE "WorkItemStatus" AS ENUM (
  'draft',
  'pending_decompose',
  'proposing',
  'in_progress',
  'adjusting',
  'cancelling',
  'completing',
  'completed',
  'cancelled'
);

ALTER TABLE "work_items"
  ALTER COLUMN "status" TYPE "WorkItemStatus"
  USING ("status"::text::"WorkItemStatus");

ALTER TABLE "work_items"
  ALTER COLUMN "rejectedFromStatus" TYPE "WorkItemStatus"
  USING ("rejectedFromStatus"::text::"WorkItemStatus");

ALTER TABLE "workflow_records"
  ALTER COLUMN "statusBefore" TYPE "WorkItemStatus"
  USING ("statusBefore"::text::"WorkItemStatus");

ALTER TABLE "workflow_records"
  ALTER COLUMN "statusAfter" TYPE "WorkItemStatus"
  USING ("statusAfter"::text::"WorkItemStatus");

ALTER TABLE "work_items"
  ADD COLUMN "beforeApprovalStatus" "WorkItemStatus",
  ADD COLUMN "approvalType" "ApprovalType";

DROP TYPE "WorkItemStatus_old";
