/*
  Warnings:

  - You are about to drop the column `contractDescription` on the `ContractRevisionTable` table. All the data in the column will be lost.
  - You are about to drop the column `federalAuthorities` on the `DraftContractFormDataTable` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[draftFormDataID]` on the table `ContractRevisionTable` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `draftFormDataID` to the `ContractRevisionTable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContractRevisionTable" DROP COLUMN "contractDescription",
ADD COLUMN     "draftFormDataID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DraftContractFormDataTable" DROP COLUMN "federalAuthorities";

-- CreateIndex
CREATE UNIQUE INDEX "ContractRevisionTable_draftFormDataID_key" ON "ContractRevisionTable"("draftFormDataID");

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_draftFormDataID_fkey" FOREIGN KEY ("draftFormDataID") REFERENCES "DraftContractFormDataTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
