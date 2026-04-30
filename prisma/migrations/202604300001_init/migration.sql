-- CreateEnum
CREATE TYPE "WorkItemType" AS ENUM ('priority', 'main', 'todo');

-- CreateEnum
CREATE TYPE "WorkItemStatus" AS ENUM (
  'draft',
  'pending_dept',
  'pending_company',
  'approved',
  'in_progress',
  'pending_decompose',
  'pending_complete',
  'pending_evidence_dept',
  'pending_evidence_company',
  'pending_main_leader_cancel',
  'completed',
  'rejected',
  'adjusting',
  'cancelling',
  'cancelled'
);

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('create', 'complete', 'adjust', 'cancel', 'todo_decompose');

-- CreateEnum
CREATE TYPE "Role" AS ENUM (
  'admin',
  'supervisor',
  'department_manager',
  'department_leader',
  'vice_president',
  'president'
);

-- CreateTable
CREATE TABLE "departments" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "code" VARCHAR(20) NOT NULL,
  "isBusiness" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
  "id" SERIAL NOT NULL,
  "username" VARCHAR(50) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  "role" "Role" NOT NULL,
  "departmentId" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "email" VARCHAR(100),
  "phone" VARCHAR(20),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_items" (
  "id" SERIAL NOT NULL,
  "type" "WorkItemType" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "status" "WorkItemStatus" NOT NULL,
  "action" "ActionType",
  "needMainLeaderCancel" BOOLEAN NOT NULL DEFAULT false,
  "businessCategory" VARCHAR(100),
  "workItem" VARCHAR(500),
  "workNode" VARCHAR(200),
  "completeTime" TIMESTAMP(3),
  "completeForm" VARCHAR(200),
  "isInnovation" BOOLEAN NOT NULL DEFAULT false,
  "departmentId" INTEGER,
  "departmentIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "cooperateDepartmentIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "creatorId" INTEGER NOT NULL,
  "currentApproverId" INTEGER,
  "currentApproverRole" "Role",
  "approvalLeaderId" INTEGER,
  "proposedLeaderId" INTEGER,
  "responsibleLeader" VARCHAR(50),
  "supervisor" VARCHAR(50),
  "responsiblePersons" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "cooperatePersons" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "proposedScene" VARCHAR(200),
  "formedTime" TIMESTAMP(3),
  "workPlan" TEXT,
  "planCompleteTime" TIMESTAMP(3),
  "progress" TEXT,
  "proof" TEXT,
  "adjustReason" TEXT,
  "cancelReason" TEXT,
  "rejectReason" TEXT,
  "rejectedFromStatus" "WorkItemStatus",
  "nodes" JSONB,
  "adjustHistory" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_records" (
  "id" SERIAL NOT NULL,
  "workItemId" INTEGER NOT NULL,
  "actionType" VARCHAR(50) NOT NULL,
  "initiatorId" INTEGER NOT NULL,
  "approverId" INTEGER,
  "approvalRole" "Role",
  "statusBefore" "WorkItemStatus" NOT NULL,
  "statusAfter" "WorkItemStatus" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "workflow_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
  "id" SERIAL NOT NULL,
  "workItemId" INTEGER,
  "userId" INTEGER NOT NULL,
  "fileName" VARCHAR(200) NOT NULL,
  "filePath" VARCHAR(500) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileType" VARCHAR(50) NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "userName" VARCHAR(50) NOT NULL,
  "userRole" "Role" NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "module" VARCHAR(50) NOT NULL,
  "targetId" INTEGER,
  "targetType" VARCHAR(50),
  "description" VARCHAR(500) NOT NULL,
  "ipAddress" VARCHAR(50),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_currentApproverId_fkey" FOREIGN KEY ("currentApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_approvalLeaderId_fkey" FOREIGN KEY ("approvalLeaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_items" ADD CONSTRAINT "work_items_proposedLeaderId_fkey" FOREIGN KEY ("proposedLeaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_records" ADD CONSTRAINT "workflow_records_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_records" ADD CONSTRAINT "workflow_records_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_records" ADD CONSTRAINT "workflow_records_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "work_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
