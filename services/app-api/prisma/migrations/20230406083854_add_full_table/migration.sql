/*
  Warnings:

  - Added the required column `modifiedGeoAreaServed` to the `DraftContractFormDataTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modifiedPassThroughPayments` to the `DraftContractFormDataTable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modifiedRiskSharingStrategy` to the `DraftContractFormDataTable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DraftContractFormDataTable" ADD COLUMN     "federalAuthorities" "FederalAuthority"[],
ADD COLUMN     "modifiedGeoAreaServed" BOOLEAN NOT NULL,
ADD COLUMN     "modifiedPassThroughPayments" BOOLEAN NOT NULL,
ADD COLUMN     "modifiedRiskSharingStrategy" BOOLEAN NOT NULL;

-- CreateTable
CREATE TABLE "ContractDocumentTable" (
    "id" TEXT NOT NULL,
    "contractFormDataID" TEXT NOT NULL,
    "s3url" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "ContractDocumentTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAdditionalDocumentsTable" (
    "id" TEXT NOT NULL,
    "contractFormDataID" TEXT NOT NULL,
    "s3url" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "ContractAdditionalDocumentsTable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractDocumentTable" ADD CONSTRAINT "ContractDocumentTable_contractFormDataID_fkey" FOREIGN KEY ("contractFormDataID") REFERENCES "DraftContractFormDataTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAdditionalDocumentsTable" ADD CONSTRAINT "ContractAdditionalDocumentsTable_contractFormDataID_fkey" FOREIGN KEY ("contractFormDataID") REFERENCES "DraftContractFormDataTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
