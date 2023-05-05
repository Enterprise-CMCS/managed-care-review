-- AlterTable
ALTER TABLE "ContractRevisionTable" ADD COLUMN     "submitInfoID" TEXT,
ADD COLUMN     "unlockInfoID" TEXT;

-- AlterTable
ALTER TABLE "RateRevisionTable" ADD COLUMN     "submitInfoID" TEXT,
ADD COLUMN     "unlockInfoID" TEXT;

-- CreateTable
CREATE TABLE "ActionInfoTable" (
    "id" TEXT NOT NULL,
    "actionAt" TIMESTAMP(3),
    "actionBy" TEXT,
    "actionReason" TEXT,

    CONSTRAINT "ActionInfoTable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_unlockInfoID_fkey" FOREIGN KEY ("unlockInfoID") REFERENCES "ActionInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_submitInfoID_fkey" FOREIGN KEY ("submitInfoID") REFERENCES "ActionInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_unlockInfoID_fkey" FOREIGN KEY ("unlockInfoID") REFERENCES "ActionInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_submitInfoID_fkey" FOREIGN KEY ("submitInfoID") REFERENCES "ActionInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
