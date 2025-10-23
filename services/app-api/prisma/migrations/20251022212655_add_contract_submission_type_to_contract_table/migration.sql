BEGIN;

-- CreateEnum
CREATE TYPE "ContractSubmissionType" AS ENUM ('HEALTH_PLAN', 'EQRO');

-- AlterTable (add column as nullable first)
ALTER TABLE "ContractTable" ADD COLUMN "contractSubmissionType" "ContractSubmissionType";

-- Backfill existing records
UPDATE "ContractTable" SET "contractSubmissionType" = 'HEALTH_PLAN' WHERE "contractSubmissionType" IS NULL;

-- Make column NOT NULL after backfilling
ALTER TABLE "ContractTable" ALTER COLUMN "contractSubmissionType" SET NOT NULL;

COMMIT;
