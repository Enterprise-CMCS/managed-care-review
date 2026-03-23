BEGIN;
-- AlterTable - Add deprecated column to HealthPlanPackageTable
ALTER TABLE "HealthPlanPackageTable" ADD COLUMN "deprecated" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable - Add deprecated column, drop formDataProto, make formData required on HealthPlanRevisionTable
ALTER TABLE "HealthPlanRevisionTable" ADD COLUMN "deprecated" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "HealthPlanRevisionTable" DROP COLUMN "formDataProto";

-- Make formData required (set any nulls first, then add NOT NULL constraint)
UPDATE "HealthPlanRevisionTable" SET "formData" = '{}'::jsonb WHERE "formData" IS NULL;
ALTER TABLE "HealthPlanRevisionTable" ALTER COLUMN "formData" SET NOT NULL;
COMMIT;
