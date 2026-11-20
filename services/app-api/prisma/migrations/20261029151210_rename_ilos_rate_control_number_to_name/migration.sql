BEGIN;

-- AlterTable
ALTER TABLE "ILOSExternalRate" RENAME COLUMN "rateControlNumber" TO "rateControlName";

COMMIT;
