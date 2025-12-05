BEGIN;
-- CreateEnum
CREATE TYPE "RateMedicaidPopulations" AS ENUM ('MEDICARE_MEDICAID_WITH_DSNP', 'MEDICAID_ONLY', 'MEDICARE_MEDICAID_WITHOUT_DSNP');

-- AlterTable
ALTER TABLE "RateRevisionTable" ADD COLUMN     "rateMedicaidPopulations" "RateMedicaidPopulations"[];
COMMIT;