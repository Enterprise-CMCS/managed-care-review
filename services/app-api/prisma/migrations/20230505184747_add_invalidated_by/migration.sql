-- AlterTable
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD COLUMN     "invalidatedByContractRevisionID" TEXT,
ADD COLUMN     "invalidatedByRateRevisionID" TEXT;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_invalidatedByContrac_fkey" FOREIGN KEY ("invalidatedByContractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_invalidatedByRateRev_fkey" FOREIGN KEY ("invalidatedByRateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
