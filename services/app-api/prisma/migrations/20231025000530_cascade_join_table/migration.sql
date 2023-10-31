BEGIN;
-- DropForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" DROP CONSTRAINT "RateRevisionsOnContractRevisionsTable_rateRevisionID_fkey";

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
