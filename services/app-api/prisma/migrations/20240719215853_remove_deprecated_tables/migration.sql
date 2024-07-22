BEGIN;
/*
  Warnings:

  - You are about to drop the `RateRevisionsOnContractRevisionsTable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ContractRevisionTableToRateTable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ContractTableToRateRevisionTable` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" DROP CONSTRAINT "RateRevisionsOnContractRevisionsTable_contractRevisionID_fkey";

-- DropForeignKey
ALTER TABLE "RateRevisionsOnContractRevisionsTable" DROP CONSTRAINT "RateRevisionsOnContractRevisionsTable_rateRevisionID_fkey";

-- DropForeignKey
ALTER TABLE "_ContractRevisionTableToRateTable" DROP CONSTRAINT "_ContractRevisionTableToRateTable_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContractRevisionTableToRateTable" DROP CONSTRAINT "_ContractRevisionTableToRateTable_B_fkey";

-- DropForeignKey
ALTER TABLE "_ContractTableToRateRevisionTable" DROP CONSTRAINT "_ContractTableToRateRevisionTable_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContractTableToRateRevisionTable" DROP CONSTRAINT "_ContractTableToRateRevisionTable_B_fkey";

-- DropTable
DROP TABLE "RateRevisionsOnContractRevisionsTable";

-- DropTable
DROP TABLE "_ContractRevisionTableToRateTable";

-- DropTable
DROP TABLE "_ContractTableToRateRevisionTable";
COMMIT;
