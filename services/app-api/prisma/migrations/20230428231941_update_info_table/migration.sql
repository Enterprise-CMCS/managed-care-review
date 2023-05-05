/*
  Warnings:

  - You are about to drop the `ActionInfoTable` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContractRevisionTable" DROP CONSTRAINT "ContractRevisionTable_submitInfoID_fkey";

-- DropForeignKey
ALTER TABLE "ContractRevisionTable" DROP CONSTRAINT "ContractRevisionTable_unlockInfoID_fkey";

-- DropForeignKey
ALTER TABLE "RateRevisionTable" DROP CONSTRAINT "RateRevisionTable_submitInfoID_fkey";

-- DropForeignKey
ALTER TABLE "RateRevisionTable" DROP CONSTRAINT "RateRevisionTable_unlockInfoID_fkey";

-- AlterTable
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ALTER COLUMN "validAfter" DROP DEFAULT;

-- DropTable
DROP TABLE "ActionInfoTable";

-- CreateTable
CREATE TABLE "UpdateInfoTable" (
    "id" TEXT NOT NULL,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "updateBy" TEXT NOT NULL,
    "updateReason" TEXT NOT NULL,

    CONSTRAINT "UpdateInfoTable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_unlockInfoID_fkey" FOREIGN KEY ("unlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_submitInfoID_fkey" FOREIGN KEY ("submitInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_unlockInfoID_fkey" FOREIGN KEY ("unlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_submitInfoID_fkey" FOREIGN KEY ("submitInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
