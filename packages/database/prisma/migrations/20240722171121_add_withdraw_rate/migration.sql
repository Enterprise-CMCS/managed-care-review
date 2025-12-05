BEGIN;
-- AlterTable
ALTER TABLE "RateTable" ADD COLUMN     "withdrawInfoID" TEXT;

-- AddForeignKey
ALTER TABLE "RateTable" ADD CONSTRAINT "RateTable_withdrawInfoID_fkey" FOREIGN KEY ("withdrawInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;
