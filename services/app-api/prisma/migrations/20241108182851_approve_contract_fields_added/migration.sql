BEGIN;

-- CreateTable
CREATE TABLE "_approvalInfos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_approvalInfos_AB_unique" ON "_approvalInfos"("A", "B");

-- CreateIndex
CREATE INDEX "_approvalInfos_B_index" ON "_approvalInfos"("B");

-- AddForeignKey
ALTER TABLE "_approvalInfos" ADD CONSTRAINT "_approvalInfos_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_approvalInfos" ADD CONSTRAINT "_approvalInfos_B_fkey" FOREIGN KEY ("B") REFERENCES "UpdateInfoTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
