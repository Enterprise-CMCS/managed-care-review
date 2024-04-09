BEGIN;
-- DropForeignKey
ALTER TABLE "DraftRateJoinTable" DROP CONSTRAINT "DraftRateJoinTable_rateID_fkey";

-- AddForeignKey
ALTER TABLE "DraftRateJoinTable" ADD CONSTRAINT "DraftRateJoinTable_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
