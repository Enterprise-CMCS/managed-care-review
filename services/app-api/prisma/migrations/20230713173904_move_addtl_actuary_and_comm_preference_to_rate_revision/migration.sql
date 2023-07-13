BEGIN;
/*
  Warnings:

  - You are about to drop the column `contractRevisionID` on the `ActuaryContact` table. All the data in the column will be lost.
  - You are about to drop the column `rateRevisionID` on the `ActuaryContact` table. All the data in the column will be lost.
  - You are about to drop the column `addtlActuaryCommunicationPreference` on the `ContractRevisionTable` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ActuaryContact" DROP CONSTRAINT "ActuaryContact_contractRevisionID_fkey";

-- DropForeignKey
ALTER TABLE "ActuaryContact" DROP CONSTRAINT "ActuaryContact_rateRevisionID_fkey";

-- AlterTable
ALTER TABLE "ActuaryContact" DROP COLUMN "contractRevisionID",
DROP COLUMN "rateRevisionID",
ADD COLUMN     "rateWithAddtlActuaryID" TEXT,
ADD COLUMN     "rateWithCertifyingActuaryID" TEXT;

-- AlterTable
ALTER TABLE "ContractRevisionTable" DROP COLUMN "addtlActuaryCommunicationPreference";

-- AddForeignKey
ALTER TABLE "ActuaryContact" ADD CONSTRAINT "ActuaryContact_rateWithCertifyingActuaryID_fkey" FOREIGN KEY ("rateWithCertifyingActuaryID") REFERENCES "RateRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActuaryContact" ADD CONSTRAINT "ActuaryContact_rateWithAddtlActuaryID_fkey" FOREIGN KEY ("rateWithAddtlActuaryID") REFERENCES "RateRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;