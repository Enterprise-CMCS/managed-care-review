BEGIN;
/*
  Warnings:

  - You are about to drop the column `invalidatedByContractRevisionID` on the `RateRevisionsOnContractRevisionsTable` table. All the data in the column will be lost.
  - You are about to drop the column `invalidatedByRateRevisionID` on the `RateRevisionsOnContractRevisionsTable` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" DROP CONSTRAINT "RateRevisionsOnContractRevisionsTable_invalidatedByContrac_fkey";

-- DropForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" DROP CONSTRAINT "RateRevisionsOnContractRevisionsTable_invalidatedByRateRev_fkey";

-- AlterTable
ALTER TABLE "RateRevisionsOnContractRevisionsTable" DROP COLUMN "invalidatedByContractRevisionID",
DROP COLUMN "invalidatedByRateRevisionID";
COMMIT;
