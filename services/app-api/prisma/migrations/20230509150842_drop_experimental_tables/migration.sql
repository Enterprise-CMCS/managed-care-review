/*
  Warnings:

  - You are about to drop the column `draftFormDataID` on the `ContractRevisionTable` table. All the data in the column will be lost.
  - You are about to drop the `ContractAdditionalDocumentsTable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContractDocumentTable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DraftContractFormDataTable` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContractAdditionalDocumentsTable" DROP CONSTRAINT "ContractAdditionalDocumentsTable_contractFormDataID_fkey";

-- DropForeignKey
ALTER TABLE "ContractDocumentTable" DROP CONSTRAINT "ContractDocumentTable_contractFormDataID_fkey";

-- DropForeignKey
ALTER TABLE "ContractRevisionTable" DROP CONSTRAINT "ContractRevisionTable_draftFormDataID_fkey";

-- DropIndex
DROP INDEX "ContractRevisionTable_draftFormDataID_key";

-- AlterTable
ALTER TABLE "ContractRevisionTable" DROP COLUMN "draftFormDataID";

-- DropTable
DROP TABLE "ContractAdditionalDocumentsTable";

-- DropTable
DROP TABLE "ContractDocumentTable";

-- DropTable
DROP TABLE "DraftContractFormDataTable";

-- DropEnum
DROP TYPE "FederalAuthority";

-- DropEnum
DROP TYPE "SubmissionType";
