BEGIN;
-- AlterTable
ALTER TABLE "ContractDocument" ADD COLUMN     "dateAdded" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ContractSupportingDocument" ADD COLUMN     "dateAdded" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RateDocument" ADD COLUMN     "dateAdded" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RateSupportingDocument" ADD COLUMN     "dateAdded" TIMESTAMP(3);

COMMIT;
