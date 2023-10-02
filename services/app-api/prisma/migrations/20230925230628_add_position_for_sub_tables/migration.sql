BEGIN;
-- AlterTable
ALTER TABLE "ActuaryContact" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT -1;

-- AlterTable
ALTER TABLE "ContractDocument" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT -1;

-- AlterTable
ALTER TABLE "ContractSupportingDocument" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT -1;

-- AlterTable
ALTER TABLE "RateDocument" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT -1;

-- AlterTable
ALTER TABLE "RateSupportingDocument" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT -1;

-- AlterTable
ALTER TABLE "StateContact" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT -1;
COMMIT;
