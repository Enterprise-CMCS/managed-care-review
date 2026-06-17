BEGIN;

-- AlterTable
ALTER TABLE "ContractTable" ADD COLUMN     "lastActionDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RateTable" ADD COLUMN     "lastActionDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ContractTable_lastActionDate_idx" ON "ContractTable"("lastActionDate");

-- CreateIndex
CREATE INDEX "RateTable_lastActionDate_idx" ON "RateTable"("lastActionDate");

COMMIT;
