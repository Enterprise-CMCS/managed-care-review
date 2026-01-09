BEGIN;
-- AlterTable
ALTER TABLE "ContractDocument" ADD COLUMN     "s3BucketName" TEXT,
ADD COLUMN     "s3Key" TEXT;

-- AlterTable
ALTER TABLE "ContractSupportingDocument" ADD COLUMN     "s3BucketName" TEXT,
ADD COLUMN     "s3Key" TEXT;

-- AlterTable
ALTER TABLE "RateDocument" ADD COLUMN     "s3BucketName" TEXT,
ADD COLUMN     "s3Key" TEXT;

-- AlterTable
ALTER TABLE "RateSupportingDocument" ADD COLUMN     "s3BucketName" TEXT,
ADD COLUMN     "s3Key" TEXT;

COMMIT;