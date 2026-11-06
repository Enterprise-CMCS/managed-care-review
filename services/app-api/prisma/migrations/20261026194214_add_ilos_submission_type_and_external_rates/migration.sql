BEGIN;

-- AlterEnum
ALTER TYPE "ContractSubmissionType" ADD VALUE 'ILOS';

-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "isILOSRatesIncluded" BOOLEAN;

-- CreateTable
CREATE TABLE "ILOSExternalRate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER NOT NULL,
    "rateControlNumber" TEXT,
    "rateDateStart" DATE,
    "rateDateEnd" DATE,
    "contractRevisionID" TEXT NOT NULL,

    CONSTRAINT "ILOSExternalRate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ILOSExternalRate" ADD CONSTRAINT "ILOSExternalRate_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
