BEGIN;

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('HEALTH_PLAN', 'EQRO');

-- AlterTable (add column as nullable first)
ALTER TABLE "ContractTable" ADD COLUMN "entityType" "EntityType";

-- Backfill existing records
UPDATE "ContractTable" SET "entityType" = 'HEALTH_PLAN' WHERE "entityType" IS NULL;

-- Make column NOT NULL after backfilling
ALTER TABLE "ContractTable" ALTER COLUMN "entityType" SET NOT NULL;

COMMIT;
