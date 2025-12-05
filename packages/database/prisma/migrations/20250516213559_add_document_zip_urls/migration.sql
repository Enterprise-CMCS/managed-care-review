BEGIN;

-- CreateEnum
CREATE TYPE "DocumentZipType" AS ENUM ('CONTRACT_DOCUMENTS', 'CONTRACT_SUPPORTING_DOCUMENTS', 'RATE_DOCUMENTS', 'RATE_SUPPORTING_DOCUMENTS');

-- CreateTable
CREATE TABLE "DocumentZipPackage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3URL" TEXT NOT NULL,
    "sha256" TEXT,
    "contractRevisionID" TEXT,
    "rateRevisionID" TEXT,
    "documentType" "DocumentZipType" NOT NULL,

    CONSTRAINT "DocumentZipPackage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentZipPackage" ADD CONSTRAINT "DocumentZipPackage_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentZipPackage" ADD CONSTRAINT "DocumentZipPackage_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
