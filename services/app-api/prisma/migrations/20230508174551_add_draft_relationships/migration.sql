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
ALTER TABLE "_ContractTableToRateRevisionTable" ADD CONSTRAINT "_ContractTableToRateRevisionTable_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractTableToRateRevisionTable" ADD CONSTRAINT "_ContractTableToRateRevisionTable_B_fkey" FOREIGN KEY ("B") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToRateTable" ADD CONSTRAINT "_ContractRevisionTableToRateTable_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToRateTable" ADD CONSTRAINT "_ContractRevisionTableToRateTable_B_fkey" FOREIGN KEY ("B") REFERENCES "RateTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
