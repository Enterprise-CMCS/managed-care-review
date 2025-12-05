BEGIN;
/*
  Warnings:

  - You are about to drop the `SharedRateCertifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ContractRevisionTableToSharedRateCertifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_RateRevisionTableToSharedRateCertifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ContractRevisionTableToSharedRateCertifications" DROP CONSTRAINT "_ContractRevisionTableToSharedRateCertifications_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContractRevisionTableToSharedRateCertifications" DROP CONSTRAINT "_ContractRevisionTableToSharedRateCertifications_B_fkey";

-- DropForeignKey
ALTER TABLE "_RateRevisionTableToSharedRateCertifications" DROP CONSTRAINT "_RateRevisionTableToSharedRateCertifications_A_fkey";

-- DropForeignKey
ALTER TABLE "_RateRevisionTableToSharedRateCertifications" DROP CONSTRAINT "_RateRevisionTableToSharedRateCertifications_B_fkey";

-- DropTable
DROP TABLE "SharedRateCertifications";

-- DropTable
DROP TABLE "_ContractRevisionTableToSharedRateCertifications";

-- DropTable
DROP TABLE "_RateRevisionTableToSharedRateCertifications";

-- CreateTable
CREATE TABLE "_SharedRateRevisions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SharedRateRevisions_AB_unique" ON "_SharedRateRevisions"("A", "B");

-- CreateIndex
CREATE INDEX "_SharedRateRevisions_B_index" ON "_SharedRateRevisions"("B");

-- AddForeignKey
ALTER TABLE "_SharedRateRevisions" ADD CONSTRAINT "_SharedRateRevisions_A_fkey" FOREIGN KEY ("A") REFERENCES "ContractTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SharedRateRevisions" ADD CONSTRAINT "_SharedRateRevisions_B_fkey" FOREIGN KEY ("B") REFERENCES "RateRevisionTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;
