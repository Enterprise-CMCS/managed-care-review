BEGIN;

-- AlterTable
ALTER TABLE "HealthPlanRevisionTable" ALTER COLUMN "formData" SET DATA TYPE JSONB;

COMMIT;
