BEGIN;

-- AlterTable
ALTER TABLE "ContractRevisionTable" 
ADD COLUMN     "ebContractorID" TEXT,
ADD COLUMN     "ebLinkedBaseContractID" TEXT,
ADD COLUMN     "ebLinkedPreviousAmendmentID" TEXT;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_ebLinkedBaseContractID_fkey" FOREIGN KEY ("ebLinkedBaseContractID") REFERENCES "ContractTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_ebLinkedPreviousAmendmentID_fkey" FOREIGN KEY ("ebLinkedPreviousAmendmentID") REFERENCES "ContractTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
