-- Migration A: compatibility expansion only.
-- A separate, explicitly parameterized data-migration script will backfill this
-- column before a later migration makes it NOT NULL.
ALTER TABLE "work_items" ADD COLUMN "assessmentYear" INTEGER;

CREATE INDEX "work_items_assessmentYear_type_workItem_idx"
ON "work_items"("assessmentYear", "type", "workItem");
