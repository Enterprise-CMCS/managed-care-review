BEGIN;
-- AlterTable
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD COLUMN     "isRemoval" BOOLEAN NOT NULL DEFAULT false;
COMMIT;
