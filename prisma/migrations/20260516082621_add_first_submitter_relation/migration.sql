-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_firstSubmitterId_fkey" FOREIGN KEY ("firstSubmitterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
