-- AlterTable
ALTER TABLE "work_items" ADD COLUMN     "responsibleLeaderMemberId" INTEGER,
ADD COLUMN     "responsiblePersonMemberId" INTEGER;

-- CreateTable
CREATE TABLE "members" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "phone" VARCHAR(20),
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_responsibleLeaderMemberId_fkey" FOREIGN KEY ("responsibleLeaderMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_responsiblePersonMemberId_fkey" FOREIGN KEY ("responsiblePersonMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
