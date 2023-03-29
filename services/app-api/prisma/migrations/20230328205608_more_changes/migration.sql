/*
  Warnings:

  - Added the required column `contractID` to the `ContractRevisionTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rateID` to the `RateRevisionTable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "contractID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RateRevisionTable" ADD COLUMN     "rateID" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
