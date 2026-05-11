BEGIN;

-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "reverseUnlockInfoID" TEXT;

-- AlterTable
ALTER TABLE "RateRevisionTable" ADD COLUMN     "reverseUnlockInfoID" TEXT;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_reverseUnlockInfoID_fkey" FOREIGN KEY ("reverseUnlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_reverseUnlockInfoID_fkey" FOREIGN KEY ("reverseUnlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
