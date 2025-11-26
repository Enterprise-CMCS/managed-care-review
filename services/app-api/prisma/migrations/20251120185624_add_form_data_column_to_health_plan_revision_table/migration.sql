BEGIN;

-- AlterTable
ALTER TABLE "HealthPlanRevisionTable" ADD COLUMN     "formData" JSON;

COMMIT;
