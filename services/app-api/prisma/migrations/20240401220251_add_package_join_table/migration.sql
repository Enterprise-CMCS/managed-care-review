BEGIN;
-- DropEnum
DROP TYPE "DocumentCategory";

-- CreateTable
CREATE TABLE "SubmissionPackageJoinTable" (
    "submissionID" TEXT NOT NULL,
    "contractRevisionID" TEXT NOT NULL,
    "rateRevisionID" TEXT NOT NULL,
    "ratePosition" INTEGER NOT NULL,

    CONSTRAINT "SubmissionPackageJoinTable_pkey" PRIMARY KEY ("submissionID","contractRevisionID","rateRevisionID")
);

-- CreateTable
CREATE TABLE "_ContractRevisionTableToUpdateInfoTable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_RateRevisionTableToUpdateInfoTable" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ContractRevisionTableToUpdateInfoTable_AB_unique" ON "_ContractRevisionTableToUpdateInfoTable"("A", "B");

-- CreateIndex
CREATE INDEX "_ContractRevisionTableToUpdateInfoTable_B_index" ON "_ContractRevisionTableToUpdateInfoTable"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_RateRevisionTableToUpdateInfoTable_AB_unique" ON "_RateRevisionTableToUpdateInfoTable"("A", "B");

-- CreateIndex
CREATE INDEX "_RateRevisionTableToUpdateInfoTable_B_index" ON "_RateRevisionTableToUpdateInfoTable"("B");

-- AddForeignKey
ALTER TABLE "SubmissionPackageJoinTable" ADD CONSTRAINT "SubmissionPackageJoinTable_submissionID_fkey" FOREIGN KEY ("submissionID") REFERENCES "UpdateInfoTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionPackageJoinTable" ADD CONSTRAINT "SubmissionPackageJoinTable_contractRevisionID_fkey" FOREIGN KEY ("contractRevisionID") REFERENCES "ContractRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionPackageJoinTable" ADD CONSTRAINT "SubmissionPackageJoinTable_rateRevisionID_fkey" FOREIGN KEY ("rateRevisionID") REFERENCES "RateRevisionTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_ContractRevisionTableToUpdateInfoTable_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_ContractRevisionTableToUpdateInfoTable_B_fkey" FOREIGN KEY ("B") REFERENCES "UpdateInfoTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RateRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_RateRevisionTableToUpdateInfoTable_A_fkey" FOREIGN KEY ("A") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RateRevisionTableToUpdateInfoTable" ADD CONSTRAINT "_RateRevisionTableToUpdateInfoTable_B_fkey" FOREIGN KEY ("B") REFERENCES "UpdateInfoTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
