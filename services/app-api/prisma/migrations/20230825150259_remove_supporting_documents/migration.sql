BEGIN;
/*
  Warnings:

  - You are about to drop the column `contractRevisionID` on the `ContractDocument` table. All the data in the column will be lost.
  - You are about to drop the column `rateRevisionID` on the `RateDocument` table. All the data in the column will be lost.
  - You are about to drop the `ContractSupportingDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RateSupportingDocument` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `contractDocumentRevisionID` to the `ContractDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supportingDocumentRevisionID` to the `ContractDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rateDocumentRevisionID` to the `RateDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supportingDocumentRevisionID` to the `RateDocument` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ContractDocument" DROP CONSTRAINT "ContractDocument_contractRevisionID_fkey";

-- DropForeignKey
ALTER TABLE "ContractSupportingDocument" DROP CONSTRAINT "ContractSupportingDocument_contractRevisionID_fkey";

-- DropForeignKey
ALTER TABLE "RateDocument" DROP CONSTRAINT "RateDocument_rateRevisionID_fkey";

-- DropForeignKey
ALTER TABLE "RateSupportingDocument" DROP CONSTRAINT "RateSupportingDocument_rateRevisionID_fkey";

-- AlterTable
ALTER TABLE "ContractDocument" DROP COLUMN "contractRevisionID",
ADD COLUMN     "contractDocumentRevisionID" TEXT NOT NULL,
ADD COLUMN     "supportingDocumentRevisionID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RateDocument" DROP COLUMN "rateRevisionID",
ADD COLUMN     "rateDocumentRevisionID" TEXT NOT NULL,
ADD COLUMN     "supportingDocumentRevisionID" TEXT NOT NULL;

-- DropTable
DROP TABLE "ContractSupportingDocument";

-- DropTable
DROP TABLE "RateSupportingDocument";

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_contractDocumentRevisionID_fkey" FOREIGN KEY ("contractDocumentRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_supportingDocumentRevisionID_fkey" FOREIGN KEY ("supportingDocumentRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDocument" ADD CONSTRAINT "RateDocument_rateDocumentRevisionID_fkey" FOREIGN KEY ("rateDocumentRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateDocument" ADD CONSTRAINT "RateDocument_supportingDocumentRevisionID_fkey" FOREIGN KEY ("supportingDocumentRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
