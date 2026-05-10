/*
  Warnings:

  - You are about to drop the column `cooperateDepartmentIds` on the `work_items` table. All the data in the column will be lost.
  - You are about to drop the column `cooperatePersons` on the `work_items` table. All the data in the column will be lost.
  - You are about to drop the column `responsibleDepartmentIds` on the `work_items` table. All the data in the column will be lost.
  - You are about to drop the column `responsiblePersons` on the `work_items` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "work_items" DROP COLUMN "cooperateDepartmentIds",
DROP COLUMN "cooperatePersons",
DROP COLUMN "responsibleDepartmentIds",
DROP COLUMN "responsiblePersons",
ADD COLUMN     "cooperators" JSONB;
