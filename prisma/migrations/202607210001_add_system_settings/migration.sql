CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultAssessmentYear" INTEGER NOT NULL,
    "dashboardNotice" TEXT,
    "updatedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "system_settings"
ADD CONSTRAINT "system_settings_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
