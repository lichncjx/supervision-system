-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "responsibleLeaderUserId" INTEGER,
ADD COLUMN     "responsiblePersonUserId" INTEGER;

-- CreateIndex
CREATE INDEX "work_items_responsibleLeaderUserId_idx" ON "work_items"("responsibleLeaderUserId");

-- CreateIndex
CREATE INDEX "work_items_responsiblePersonUserId_idx" ON "work_items"("responsiblePersonUserId");

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_responsibleLeaderUserId_fkey" FOREIGN KEY ("responsibleLeaderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_responsiblePersonUserId_fkey" FOREIGN KEY ("responsiblePersonUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
