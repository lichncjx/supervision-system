CREATE TYPE "WorkAdjustmentRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "work_adjustment_requests" (
  "id" SERIAL NOT NULL,
  "workItemId" INTEGER NOT NULL,
  "status" "WorkAdjustmentRequestStatus" NOT NULL DEFAULT 'pending',
  "reason" TEXT NOT NULL,
  "patch" JSONB NOT NULL,
  "beforeSnapshot" JSONB NOT NULL,
  "requestedById" INTEGER NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedById" INTEGER,
  "approvedAt" TIMESTAMP(3),
  "rejectedById" INTEGER,
  "rejectedAt" TIMESTAMP(3),
  "rejectReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "work_adjustment_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "work_adjustment_requests_workItemId_status_idx"
  ON "work_adjustment_requests"("workItemId", "status");

ALTER TABLE "work_adjustment_requests"
  ADD CONSTRAINT "work_adjustment_requests_workItemId_fkey"
  FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
