BEGIN;

ALTER TABLE "ContractRevisionTable" DROP CONSTRAINT "ContractRevisionTable_reverseUnlockInfoID_fkey";
ALTER TABLE "RateRevisionTable" DROP CONSTRAINT "RateRevisionTable_reverseUnlockInfoID_fkey";
ALTER TABLE "ContractRevisionTable" RENAME COLUMN "reverseUnlockInfoID" TO "undoUnlockInfoID";
ALTER TABLE "RateRevisionTable" RENAME COLUMN "reverseUnlockInfoID" TO "undoUnlockInfoID";
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_undoUnlockInfoID_fkey" FOREIGN KEY ("undoUnlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_undoUnlockInfoID_fkey" FOREIGN KEY ("undoUnlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
