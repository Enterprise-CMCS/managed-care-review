BEGIN;
/*
  Warnings:

  - You are about to drop the column `name` on the `RateRevisionTable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RateRevisionTable" DROP COLUMN "name";
COMMIT;
