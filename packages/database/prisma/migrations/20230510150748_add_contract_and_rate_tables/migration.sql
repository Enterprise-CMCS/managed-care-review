BEGIN;
-- CreateTable
CREATE TABLE "ContractTable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "ContractTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateTable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "RateTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractRevisionTable" (
    "id" TEXT NOT NULL,
    "contractID" TEXT NOT NULL,
    "unlockInfoID" TEXT,
    "submitInfoID" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "ContractRevisionTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateRevisionTable" (
    "id" TEXT NOT NULL,
    "rateID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockInfoID" TEXT,
    "submitInfoID" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "RateRevisionTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateRevisionsOnContractRevisionsTable" (
    "rateRevisionID" TEXT NOT NULL,
    "contractRevisionID" TEXT NOT NULL,
    "validAfter" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedByContractRevisionID" TEXT,
    "invalidatedByRateRevisionID" TEXT,

    CONSTRAINT "RateRevisionsOnContractRevisionsTable_pkey" PRIMARY KEY ("rateRevisionID","contractRevisionID","validAfter")
);

-- CreateTable
CREATE TABLE "UpdateInfoTable" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByID" TEXT NOT NULL,
    "updatedReason" TEXT NOT NULL,

    CONSTRAINT "UpdateInfoTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContractTableToRateRevisionTable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ContractRevisionTableToRateTable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ContractTableToRateRevisionTable_AB_unique" ON "_ContractTableToRateRevisionTable"("A", "B");

-- CreateIndex
CREATE INDEX "_ContractTableToRateRevisionTable_B_index" ON "_ContractTableToRateRevisionTable"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ContractRevisionTableToRateTable_AB_unique" ON "_ContractRevisionTableToRateTable"("A", "B");

-- CreateIndex
CREATE INDEX "_ContractRevisionTableToRateTable_B_index" ON "_ContractRevisionTableToRateTable"("B");

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_contractID_fkey" FOREIGN KEY ("contractID") REFERENCES "ContractTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_unlockInfoID_fkey" FOREIGN KEY ("unlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractRevisionTable" ADD CONSTRAINT "ContractRevisionTable_submitInfoID_fkey" FOREIGN KEY ("submitInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_rateID_fkey" FOREIGN KEY ("rateID") REFERENCES "RateTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_unlockInfoID_fkey" FOREIGN KEY ("unlockInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionTable" ADD CONSTRAINT "RateRevisionTable_submitInfoID_fkey" FOREIGN KEY ("submitInfoID") REFERENCES "UpdateInfoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_invalidatedByContrac_fkey" FOREIGN KEY ("invalidatedByContractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" ADD CONSTRAINT "RateRevisionsOnContractRevisionsTable_invalidatedByRateRev_fkey" FOREIGN KEY ("invalidatedByRateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateInfoTable" ADD CONSTRAINT "UpdateInfoTable_updatedByID_fkey" FOREIGN KEY ("updatedByID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractTableToRateRevisionTable" ADD CONSTRAINT "_ContractTableToRateRevisionTable_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractTableToRateRevisionTable" ADD CONSTRAINT "_ContractTableToRateRevisionTable_B_fkey" FOREIGN KEY ("B") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToRateTable" ADD CONSTRAINT "_ContractRevisionTableToRateTable_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToRateTable" ADD CONSTRAINT "_ContractRevisionTableToRateTable_B_fkey" FOREIGN KEY ("B") REFERENCES "RateTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
